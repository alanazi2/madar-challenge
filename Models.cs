using System.Text.Json.Serialization;

namespace MadarChallenge;

/// <summary>سؤال في بنك الأسئلة (مصدره ملفات محتوى مدار الرسمية).</summary>
public sealed record Question(
    string Id, string Orbit, string Field, int Lv, string Q, string[] O, int A, string X, string Src);

public sealed record AnswerLog(string Qid, bool Ok, int Ms);

/// <summary>جولة منتهية (تُحفظ في data/rounds.jsonl).</summary>
public sealed class Round
{
    public string Id { get; set; } = "";
    public string Day { get; set; } = "";          // yyyy-MM-dd بتوقيت الرياض
    public long Ts { get; set; }                   // Unix ms
    public string Name { get; set; } = "";
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
    public string PublicUrl { get; set; } = "";      // الرابط الذي يحمله الـ QR (فارغ = عنوان الصفحة)
}

public sealed record Rec(string Title, string Url, string Why);

// ---------- طلبات/ردود الـ API ----------
public sealed record StartRequest(string? Name, string? Field, int Level, string? Orbit);
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
