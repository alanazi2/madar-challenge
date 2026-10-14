using System.Text.Json;

namespace MadarChallenge;

public sealed class QuestionBank
{
    public IReadOnlyList<Question> All { get; }
    public IReadOnlyDictionary<string, Question> ById { get; }

    public static readonly string[] Orbits = { "pos", "idn", "jdg", "trt" };
    public static readonly string[] Fields = { "ai", "cyber" };

    /// <summary>عدد أسئلة الجولة لكل مستوى: 12 / 15 / 15.</summary>
    public static int CountFor(int level) => level == 1 ? 12 : 15;

    /// <summary>توزيع صعوبة الأسئلة المسحوبة لكل مستوى [lv1, lv2, lv3] — مجموعه 12 أو 15.</summary>
    static readonly Dictionary<int, int[]> Mix = new()
    {
        [1] = new[] { 7, 4, 1 },   // = 12
        [2] = new[] { 3, 7, 5 },   // = 15
        [3] = new[] { 2, 5, 8 },   // = 15
    };

    public QuestionBank(IWebHostEnvironment env)
    {
        var path = Path.Combine(AppContext.BaseDirectory, "Data", "questions.json");
        if (!File.Exists(path)) path = Path.Combine(env.ContentRootPath, "Data", "questions.json");
        var list = JsonSerializer.Deserialize<List<Question>>(File.ReadAllText(path),
            new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
            ?? throw new InvalidOperationException("questions.json فارغ");
        Validate(list);
        All = list;
        ById = list.ToDictionary(q => q.Id);
    }

    static void Validate(List<Question> list)
    {
        var ids = new HashSet<string>();
        foreach (var q in list)
        {
            if (!ids.Add(q.Id)) throw new InvalidOperationException($"معرّف مكرر {q.Id}");
            if (q.O.Length != 4 || q.A is < 0 or > 3) throw new InvalidOperationException($"سؤال غير صالح {q.Id}");
        }
    }

    /// <summary>
    /// سحب عشوائي حقيقي لكل مشارك: من مجموعة (المجال × المدار) نسحب أسئلة بحسب توزيع الصعوبة،
    /// ثم نرتّبها من الأسهل إلى الأصعب مع خلط داخل كل درجة، ونخلط خيارات كل سؤال.
    /// إذا كان المدار "mix" نسحب من المدارات الأربعة معًا.
    /// </summary>
    public List<(Question q, int[] perm)> Draw(string field, string orbit, int level, Random rng)
    {
        var pool = All.Where(q => q.Field == field && (orbit == "mix" || q.Orbit == orbit)).ToList();
        var want = Mix[level];
        var picked = new List<Question>();
        var leftovers = new List<Question>();
        for (int lv = 1; lv <= 3; lv++)
        {
            var bucket = pool.Where(q => q.Lv == lv).OrderBy(_ => rng.Next()).ToList();
            var take = Math.Min(want[lv - 1], bucket.Count);
            picked.AddRange(bucket.Take(take));
            leftovers.AddRange(bucket.Skip(take));
        }
        var need = CountFor(level) - picked.Count;      // تعويض النقص (لو المجموعة أصغر)
        if (need > 0) picked.AddRange(leftovers.OrderBy(_ => rng.Next()).Take(need));

        return picked
            .GroupBy(q => q.Lv).OrderBy(g => g.Key)
            .SelectMany(g => g.OrderBy(_ => rng.Next()))
            .Select(q => (q, Enumerable.Range(0, 4).OrderBy(_ => rng.Next()).ToArray()))
            .ToList();
    }
}
