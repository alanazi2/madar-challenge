using System.Text.Json;

namespace MadarChallenge;

/// <summary>تخزين خفيف بلا مكتبات خارجية: ذاكرة + سجل JSON Lines دائم (rounds.jsonl) + config.json.</summary>
public sealed class Store
{
    static readonly JsonSerializerOptions J = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
    readonly object _lock = new();
    readonly string _dir, _roundsPath, _configPath, _recsPath;
    readonly List<Round> _rounds = new();
    public AppConfig Config { get; private set; } = new();
    public Dictionary<string, List<Rec>> Recs { get; private set; } = new();

    public static readonly TimeZoneInfo Riyadh = ResolveRiyadh();
    static TimeZoneInfo ResolveRiyadh()
    {
        foreach (var id in new[] { "Asia/Riyadh", "Arab Standard Time" })
            try { return TimeZoneInfo.FindSystemTimeZoneById(id); } catch { }
        return TimeZoneInfo.CreateCustomTimeZone("AST", TimeSpan.FromHours(3), "AST", "AST");
    }
    public static string Today() => DayOf(DateTimeOffset.UtcNow);
    public static string DayOf(DateTimeOffset t) => TimeZoneInfo.ConvertTime(t, Riyadh).ToString("yyyy-MM-dd");

    public Store(IConfiguration cfg, IWebHostEnvironment env)
    {
        _dir = cfg["MADAR_DATA_DIR"] ?? Path.Combine(env.ContentRootPath, "data");
        Directory.CreateDirectory(_dir);
        _roundsPath = Path.Combine(_dir, "rounds.jsonl");
        _configPath = Path.Combine(_dir, "config.json");
        _recsPath = Path.Combine(_dir, "recs.json");

        if (File.Exists(_roundsPath))
            foreach (var line in File.ReadLines(_roundsPath))
            {
                if (string.IsNullOrWhiteSpace(line)) continue;
                try { var r = JsonSerializer.Deserialize<Round>(line, J); if (r != null) _rounds.Add(r); } catch { /* سطر تالف: نتجاهله */ }
            }
        if (File.Exists(_configPath))
            try { Config = JsonSerializer.Deserialize<AppConfig>(File.ReadAllText(_configPath), J) ?? new(); } catch { }

        var defaultRecs = Path.Combine(AppContext.BaseDirectory, "Data", "recs.json");
        if (!File.Exists(defaultRecs)) defaultRecs = Path.Combine(env.ContentRootPath, "Data", "recs.json");
        var src = File.Exists(_recsPath) ? _recsPath : defaultRecs;
        Recs = JsonSerializer.Deserialize<Dictionary<string, List<Rec>>>(File.ReadAllText(src), J) ?? new();
    }

    public void AddRound(Round r)
    {
        lock (_lock)
        {
            _rounds.Add(r);
            File.AppendAllText(_roundsPath, JsonSerializer.Serialize(r, J) + "\n");
        }
    }

    /// <summary>نسخة لقطة من الجولات (للقراءة الآمنة).</summary>
    public List<Round> Snapshot() { lock (_lock) return new List<Round>(_rounds); }

    public bool SetHidden(string id, bool hidden)
    {
        lock (_lock)
        {
            var r = _rounds.FirstOrDefault(x => x.Id == id);
            if (r == null) return false;
            r.Hidden = hidden;
            File.WriteAllLines(_roundsPath, _rounds.Select(x => JsonSerializer.Serialize(x, J)));
            return true;
        }
    }

    public void SaveConfig(AppConfig c)
    {
        lock (_lock) { Config = c; WriteAtomic(_configPath, JsonSerializer.Serialize(c, J)); }
    }

    public void SaveRecs(Dictionary<string, List<Rec>> recs)
    {
        lock (_lock) { Recs = recs; WriteAtomic(_recsPath, JsonSerializer.Serialize(recs, J)); }
    }

    static void WriteAtomic(string path, string text)
    {
        var tmp = path + ".tmp";
        File.WriteAllText(tmp, text);
        File.Move(tmp, path, true);
    }
}
