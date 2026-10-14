using System.Collections.Concurrent;
using System.Security.Cryptography;

namespace MadarChallenge;

/// <summary>
/// جلسات المتسابقين الحيّة. الخادم هو المرجع الوحيد للإجابات الصحيحة والوقت والنقاط:
/// لا تُرسَل الإجابة الصحيحة للمتصفح قبل أن يجيب المشارك، ولا يُرسَل السؤال التالي قبل ذلك.
/// </summary>
public sealed class SessionService
{
    public const int LimitMs = 20_000;     // مهلة السؤال
    const int GraceMs = 3_000;             // سماح لتأخر الشبكة
    const int BasePoints = 100, MaxBonus = 50;

    sealed class Session
    {
        public string Id = "";
        public string Name = "", Field = "", Orbit = "";
        public int Level;
        public List<(Question q, int[] perm)> Items = new();
        public int Index;
        public long SentAt;                 // لحظة إرسال السؤال الحالي
        public int Score, Correct, TotalMs;
        public List<AnswerLog> Log = new();
        public long Created;
        public bool Done;
        public readonly object Lock = new();
    }

    readonly ConcurrentDictionary<string, Session> _s = new();
    readonly QuestionBank _bank;
    readonly Store _store;

    public SessionService(QuestionBank bank, Store store) { _bank = bank; _store = store; }

    static long Now() => Environment.TickCount64;

    static string NewId() => Convert.ToHexString(RandomNumberGenerator.GetBytes(12)).ToLowerInvariant();

    public static string? CleanName(string? n)
    {
        if (n == null) return null;
        var s = new string(n.Where(c => !char.IsControl(c) && c != '<' && c != '>').ToArray());
        s = string.Join(' ', s.Split(' ', StringSplitOptions.RemoveEmptyEntries));
        return s.Length is < 2 or > 24 ? null : s;
    }

    public (string id, QuestionView first)? Start(string? name, string? field, int level, string? orbit)
    {
        var clean = CleanName(name);
        if (clean == null || !QuestionBank.Fields.Contains(field) || level is < 1 or > 3) return null;
        orbit = string.IsNullOrEmpty(orbit) ? "mix" : orbit;
        if (orbit != "mix" && !QuestionBank.Orbits.Contains(orbit)) return null;

        Sweep();
        // RandomNumberGenerator-based seed → كل متسابق له مجموعة وترتيب مختلفان
        var rng = new Random(BitConverter.ToInt32(RandomNumberGenerator.GetBytes(4)));
        var items = _bank.Draw(field!, orbit, level, rng);
        var s = new Session { Id = NewId(), Name = clean, Field = field!, Orbit = orbit, Level = level, Items = items, Created = Now() };
        s.SentAt = Now();
        _s[s.Id] = s;
        return (s.Id, View(s));
    }

    static QuestionView View(Session s)
    {
        var (q, perm) = s.Items[s.Index];
        return new QuestionView(s.Index + 1, s.Items.Count, q.Id, q.Orbit, q.Lv, q.Q,
            perm.Select(i => q.O[i]).ToArray(), q.Src, LimitMs);
    }

    /// <returns>null = جلسة غير موجودة؛ تُرجع النتيجة أو خطأ نصي</returns>
    public (AnswerResult? res, string? err) Answer(string id, int index, int choice)
    {
        if (!_s.TryGetValue(id, out var s)) return (null, "notfound");
        lock (s.Lock)
        {
            if (s.Done) return (null, "done");
            if (index != s.Index + 1) return (null, "badindex");   // يمنع الإعادة والقفز
            var (q, perm) = s.Items[s.Index];
            var elapsed = (int)Math.Min(Now() - s.SentAt, int.MaxValue);
            var timedOut = elapsed > LimitMs + GraceMs;
            var chosen = choice is >= 0 and < 4 ? perm[choice] : -1;   // الخيار المعروض → الفهرس الأصلي
            var ok = !timedOut && chosen == q.A;
            var ms = Math.Min(elapsed, LimitMs);
            var pts = ok ? BasePoints + (int)Math.Round(MaxBonus * Math.Max(0.0, 1.0 - ms / (double)LimitMs)) : 0;
            s.Score += pts; if (ok) s.Correct++; s.TotalMs += ms;
            s.Log.Add(new AnswerLog(q.Id, ok, ms));
            var correctShown = Array.IndexOf(perm, q.A);

            s.Index++;
            if (s.Index < s.Items.Count)
            {
                s.SentAt = Now();
                return (new AnswerResult(ok, correctShown, q.X, q.Src, pts, s.Score, ms, View(s), null), null);
            }
            s.Done = true;
            var fin = Finish(s);
            _s.TryRemove(id, out _);
            return (new AnswerResult(ok, correctShown, q.X, q.Src, pts, s.Score, ms, null, fin), null);
        }
    }

    FinalResult Finish(Session s)
    {
        var r = new Round
        {
            Id = NewId(), Day = Store.Today(), Ts = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            Name = s.Name, Field = s.Field, Orbit = s.Orbit, Level = s.Level,
            Score = s.Score, Correct = s.Correct, Total = s.Items.Count, Ms = s.TotalMs, Answers = s.Log
        };
        _store.AddRound(r);

        var today = _store.Snapshot().Where(x => x.Day == r.Day && !x.Hidden).ToList();
        var best = BestPerName(today);
        // الترتيب بحسب أفضل نتيجة للمشارك اليوم (قد تكون من جولة سابقة بالاسم نفسه)
        var mine = best.First(b => b.Name.Trim().ToLowerInvariant() == s.Name.Trim().ToLowerInvariant());
        var rank = best.Count(b => b.Score > mine.Score) + 1;
        return new FinalResult(r.Id, s.Name, s.Score, s.Correct, s.Items.Count, s.TotalMs, rank, best.Count,
            Pick("satr-" + s.Field, s.Level - 1), PickLib(s.Orbit), Pick("challenge", 0));
    }

    Rec Pick(string key, int i)
    {
        var l = _store.Recs.GetValueOrDefault(key) ?? new();
        return l.Count == 0 ? new Rec("", "", "") : l[Math.Min(Math.Max(i, 0), l.Count - 1)];
    }
    Rec PickLib(string orbit) =>
        orbit == "pos" ? Pick("library-pos", 0) : Pick("library-default", 0);

    /// <summary>أفضل جولة لكل اسم (بدون حساسية للحالة) ضمن مجموعة جولات.</summary>
    public static List<Round> BestPerName(IEnumerable<Round> rounds) =>
        rounds.GroupBy(r => r.Name.Trim().ToLowerInvariant())
              .Select(g => g.OrderByDescending(r => r.Score).ThenBy(r => r.Ms).First())
              .OrderByDescending(r => r.Score).ThenBy(r => r.Ms).ToList();

    void Sweep()
    {
        var cutoff = Now() - 45 * 60_000L;
        foreach (var kv in _s) if (kv.Value.Created < cutoff) _s.TryRemove(kv.Key, out _);
    }

    public int ActiveCount => _s.Count;
}
