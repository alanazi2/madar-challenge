using System.Collections.Concurrent;
using System.Globalization;
using System.Text;
using System.Text.Encodings.Web;
using System.Text.Json;
using MadarChallenge;

// عند التشغيل من مجلد النشر (publish) نعتمد مجلد التطبيق جذرًا حتى لا يتأثر بمجلد التشغيل الحالي
var root = Directory.Exists(Path.Combine(AppContext.BaseDirectory, "wwwroot")) ? AppContext.BaseDirectory : Directory.GetCurrentDirectory();
var builder = WebApplication.CreateBuilder(new WebApplicationOptions { Args = args, ContentRootPath = root });
builder.Services.ConfigureHttpJsonOptions(o =>
{
    o.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.CamelCase;
    o.SerializerOptions.Encoder = JavaScriptEncoder.UnsafeRelaxedJsonEscaping;
});
builder.Services.AddSingleton<QuestionBank>();
builder.Services.AddSingleton<Store>();
builder.Services.AddSingleton<SessionService>();
// يسمح بتشغيل الواجهة على استضافة مستقلة (مثل Netlify) وربطها بهذا الـ API:  MADAR_CORS_ORIGINS=https://site1,https://site2
var origins = (builder.Configuration["MADAR_CORS_ORIGINS"] ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
{
    if (origins.Length > 0) p.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod();
}));

var app = builder.Build();
var adminPin = app.Configuration["MADAR_ADMIN_PIN"] ?? "2026";
if (adminPin == "2026") app.Logger.LogWarning("MADAR_ADMIN_PIN غير مضبوط: يُستخدم الرمز الافتراضي 2026. غيّره قبل الفعالية.");

app.UseCors();
app.UseDefaultFiles();
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = c =>
    {
        // الصفحات لا تُخزَّن مؤقتًا (تحديثات فورية)، والخطوط/الصور تُخزَّن
        var p = c.File.Name;
        c.Context.Response.Headers.CacheControl = p.EndsWith(".html") ? "no-store" : "public,max-age=86400";
    }
});

// -------- حدّ بسيط لعدد الجولات الجديدة لكل عنوان IP في الدقيقة (يتحمّل شبكة القاعة المشتركة) --------
var hits = new ConcurrentDictionary<string, (long minute, int n)>();
bool Allowed(HttpContext c, int max)
{
    var ip = c.Connection.RemoteIpAddress?.ToString() ?? "?";
    var m = Environment.TickCount64 / 60_000;
    var cur = hits.AddOrUpdate(ip, _ => (m, 1), (_, v) => v.minute == m ? (m, v.n + 1) : (m, 1));
    return cur.n <= max;
}

bool Admin(HttpContext c) =>
    c.Request.Headers.TryGetValue("X-Admin-Pin", out var v) && v.ToString() == adminPin;

var api = app.MapGroup("/api");

// ================= عام =================
api.MapGet("/health", () => Results.Ok(new { ok = true }));

api.MapGet("/config", (Store st) => Results.Ok(new
{
    platform = st.Config.Platform,
    publicUrl = st.Config.PublicUrl,
    limitMs = SessionService.LimitMs,
    counts = new { l1 = QuestionBank.CountFor(1), l2 = QuestionBank.CountFor(2), l3 = QuestionBank.CountFor(3) }
}));

api.MapPost("/sessions", (HttpContext c, StartRequest req, SessionService svc) =>
{
    if (!Allowed(c, 300)) return Results.StatusCode(429);
    var r = svc.Start(req.Name, req.Field, req.Level, req.Orbit);
    return r is null ? Results.BadRequest(new { error = "invalid" })
                     : Results.Ok(new { sessionId = r.Value.id, question = r.Value.first });
});

api.MapPost("/sessions/{id}/answer", (string id, AnswerRequest req, SessionService svc) =>
{
    var (res, err) = svc.Answer(id, req.Index, req.Choice);
    return res is not null ? Results.Ok(res)
         : err == "notfound" ? Results.NotFound(new { error = err })
         : Results.Conflict(new { error = err });
});

api.MapGet("/leaderboard", (Store st, string? scope, string? field, string? orbit, int? level, int? limit) =>
{
    var day = Store.Today();
    var rows = st.Snapshot().Where(r => !r.Hidden && (scope == "all" || r.Day == day)
        && (string.IsNullOrEmpty(field) || r.Field == field)
        && (string.IsNullOrEmpty(orbit) || orbit == "all" || r.Orbit == orbit)
        && (level is null or 0 || r.Level == level));
    var best = SessionService.BestPerName(rows).Take(Math.Clamp(limit ?? 10, 1, 50))
        .Select((r, i) => new { rank = i + 1, name = r.Name, score = r.Score, correct = r.Correct, total = r.Total, field = r.Field, orbit = r.Orbit, level = r.Level });
    return Results.Ok(best);
});

api.MapGet("/stats", (Store st, SessionService svc) =>
{
    var day = Store.Today();
    var all = st.Snapshot().Where(r => !r.Hidden).ToList();
    var today = all.Where(r => r.Day == day).ToList();
    return Results.Ok(new
    {
        roundsToday = today.Count,
        participantsToday = today.Select(r => r.Name.Trim().ToLowerInvariant()).Distinct().Count(),
        avgPct = today.Count == 0 ? 0 : (int)Math.Round(100.0 * today.Sum(r => r.Correct) / today.Sum(r => r.Total)),
        roundsAll = all.Count,
        playingNow = svc.ActiveCount
    });
});

// ================= لوحة التحكم (X-Admin-Pin) =================
var adm = api.MapGroup("/admin");
adm.AddEndpointFilter(async (ctx, next) =>
    Admin(ctx.HttpContext) ? await next(ctx) : Results.Unauthorized());

adm.MapGet("/ping", () => Results.Ok(new { ok = true }));

adm.MapGet("/summary", (Store st, QuestionBank bank, string? day) =>
{
    var d = string.IsNullOrEmpty(day) ? Store.Today() : day;
    var all = st.Snapshot();
    var rows = all.Where(r => !r.Hidden && (d == "all" || r.Day == d)).ToList();
    double Pct(IEnumerable<Round> x) { var l = x.ToList(); var t = l.Sum(r => r.Total); return t == 0 ? 0 : Math.Round(100.0 * l.Sum(r => r.Correct) / t, 1); }

    var byOrbit = QuestionBank.Orbits.Select(o => new { key = o, rounds = rows.Count(r => r.Orbit == o), pct = Pct(rows.Where(r => r.Orbit == o)) });
    var byField = QuestionBank.Fields.Select(f => new { key = f, rounds = rows.Count(r => r.Field == f), pct = Pct(rows.Where(r => r.Field == f)) });
    var byLevel = new[] { 1, 2, 3 }.Select(l => new { key = l, rounds = rows.Count(r => r.Level == l), pct = Pct(rows.Where(r => r.Level == l)) });
    var byHour = rows.GroupBy(r => TimeZoneInfo.ConvertTime(DateTimeOffset.FromUnixTimeMilliseconds(r.Ts), Store.Riyadh).Hour)
        .OrderBy(g => g.Key).Select(g => new { hour = g.Key, rounds = g.Count() });
    var days = all.Select(r => r.Day).Distinct().OrderDescending().Take(10);

    var qstat = rows.SelectMany(r => r.Answers).GroupBy(a => a.Qid)
        .Where(g => bank.ById.ContainsKey(g.Key))
        .Select(g => new { id = g.Key, q = bank.ById[g.Key].Q, orbit = bank.ById[g.Key].Orbit, field = bank.ById[g.Key].Field,
                           n = g.Count(), pct = Math.Round(100.0 * g.Count(a => a.Ok) / g.Count(), 1), avgMs = (int)g.Average(a => a.Ms) })
        .ToList();
    var hardest = qstat.Where(x => x.n >= 3).OrderBy(x => x.pct).ThenByDescending(x => x.n).Take(8);

    return Results.Ok(new
    {
        day = d, days,
        rounds = rows.Count,
        participants = rows.Select(r => r.Name.Trim().ToLowerInvariant()).Distinct().Count(),
        pct = Pct(rows),
        avgScore = rows.Count == 0 ? 0 : (int)Math.Round(rows.Average(r => r.Score)),
        byOrbit, byField, byLevel, byHour, hardest,
        poolSize = bank.All.Count,
        config = st.Config
    });
});

adm.MapGet("/rounds", (Store st, string? day) =>
{
    var d = string.IsNullOrEmpty(day) ? Store.Today() : day;
    return Results.Ok(st.Snapshot().Where(r => d == "all" || r.Day == d).OrderByDescending(r => r.Ts).Take(200)
        .Select(r => new { r.Id, r.Name, r.Score, r.Correct, r.Total, r.Field, r.Orbit, r.Level, r.Hidden, r.Ts }));
});

adm.MapPost("/rounds/{id}/hide", (string id, Store st) => st.SetHidden(id, true) ? Results.Ok() : Results.NotFound());
adm.MapPost("/rounds/{id}/show", (string id, Store st) => st.SetHidden(id, false) ? Results.Ok() : Results.NotFound());

adm.MapPut("/platform", (PlatformRequest req, Store st) =>
{
    if (!new[] { "none", "challenges", "satr", "library" }.Contains(req.Platform)) return Results.BadRequest();
    st.SaveConfig(new AppConfig { Platform = req.Platform, PublicUrl = st.Config.PublicUrl });
    return Results.Ok(st.Config);
});

adm.MapPut("/public-url", (PublicUrlRequest req, Store st) =>
{
    var u = (req.Url ?? "").Trim();
    if (u != "" && !(Uri.TryCreate(u, UriKind.Absolute, out var uri) && (uri.Scheme == "http" || uri.Scheme == "https")))
        return Results.BadRequest(new { error = "url" });
    st.SaveConfig(new AppConfig { Platform = st.Config.Platform, PublicUrl = u.TrimEnd('/') });
    return Results.Ok(st.Config);
});

adm.MapGet("/recs", (Store st) => Results.Ok(st.Recs));
adm.MapPut("/recs", (Dictionary<string, List<Rec>> recs, Store st) =>
{
    foreach (var r in recs.Values.SelectMany(x => x))
        if (r.Url != "" && !(Uri.TryCreate(r.Url, UriKind.Absolute, out var u) && u.Scheme == "https")) return Results.BadRequest(new { error = "url", r.Url });
    st.SaveRecs(recs);
    return Results.Ok(st.Recs);
});

adm.MapGet("/export.csv", (Store st) =>
{
    static string E(string s) => "\"" + s.Replace("\"", "\"\"") + "\"";
    // نمنع حقن الصيغ في Excel
    static string Safe(string s) => s.Length > 0 && "=+-@\t\r".Contains(s[0]) ? "'" + s : s;
    var sb = new StringBuilder("﻿التاريخ,الاسم,المجال,المدار,المستوى,النقاط,الصحيحة,الإجمالي,الزمن(ث)\n");
    foreach (var r in st.Snapshot().OrderBy(r => r.Ts))
        sb.AppendLine(string.Join(',', r.Day, E(Safe(r.Name)), r.Field, r.Orbit, r.Level, r.Score, r.Correct, r.Total,
            (r.Ms / 1000.0).ToString("0.0", CultureInfo.InvariantCulture)));
    return Results.File(Encoding.UTF8.GetBytes(sb.ToString()), "text/csv; charset=utf-8", "madar-rounds.csv");
});

app.MapFallbackToFile("index.html");
app.Run();

public partial class Program { }
