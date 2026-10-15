using System.Text.Json.Serialization;

namespace MadarChallenge;

/// <summary>سؤال في بنك الأسئلة (مصدره ملفات محتوى مدار الرسمية).</summary>
public sealed record QuestionEn(string Q, string[] O, string X);
public sealed record Question(
    string Id, string Orbit, string Field, int Lv, string Q, string[] O, int A, string X, string Src, QuestionEn? En = null);

public sealed record AnswerLog(string Qid, bool Ok, int Ms);

/// <summary>جولة منتهية (تُحفظ في data/rounds.jsonl).</summary>
public sealed class Round
{
    public string Id { get; set; } = "";
    public string Day { get; set; } = "";          // yyyy-MM-dd بتوقيت الرياض
    public long Ts { get; set; }                   // Unix ms
    public string Name { get; set; } = "";
    public string Phone { get; set; } = "";         // وسيلة التواصل (للإدارة فقط، لا تظهر في اللوحة العامة)
    public string Field { get; set; } = "";        // ai | cyber
    public string Orbit { get; set; } = "";        // pos | idn | jdg | trt | mix
    public int Level { get; set; }
    public int Score { get; set; }
    public int Correct { get; set; }
    public int Total { get; set; }
    public int Ms { get; set; }
    public bool Hidden { get; set; }
    public List<AnswerLog> Answers { get; set; } = new();
}

public sealed class AppConfig
{
    public string Platform { get; set; } = "none";   // none | challenges | satr | library (لون الشارة فقط)
    public string PublicUrl { get; set; } = "";
    public Dictionary<string, long> ClosedDays { get; set; } = new();   // يوم → وقت الإغلاق (Unix ms). يوم مغلق = لا جولات جديدة      // الرابط الذي يحمله الـ QR (فارغ = عنوان الصفحة)
}

public sealed record Rec(string Title, string Url, string Why, string? TitleEn = null, string? WhyEn = null);

// ---------- طلبات/ردود الـ API ----------
public sealed record StartRequest(string? Name, string? Phone, string? Field, int Level, string? Orbit, string? Lang = null);
public sealed record AnswerRequest(int Index, int Choice);
public sealed record PlatformRequest(string Platform);
public sealed record PublicUrlRequest(string Url);

public sealed record QuestionView(int Index, int Total, string Id, string Orbit, int Lv, string Q, string[] O, string Src, int LimitMs);

public sealed record AnswerResult(
    bool Correct, int CorrectChoice, string Explanation, string Src, int Points, int Score, int Ms,
    QuestionView? Next, FinalResult? Final);

public sealed record FinalResult(
    string RoundId, string Name, int Score, int Correct, int Total, int Ms, int Rank, int Participants,
    Rec Satr, Rec Library, Rec Challenge);

public sealed record Winner(int Rank, string Name, string Phone, int Score, int Correct, int Total, string Field, string Orbit, int Level, double Seconds);
public sealed record DayWinners(string Day, bool Open, int Participants, int Rounds, List<Winner> Top);

public sealed record DayRow(int Rank, string Name, string Phone, string Field, string Orbit, int Level, int Score, int Correct, int Total, double Seconds, int RoundsPlayed);
public sealed record DayReport(string Day, bool Closed, long? ClosedAt, int Participants, int Rounds, List<DayRow> Rows);
