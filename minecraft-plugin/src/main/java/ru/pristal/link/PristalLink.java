package ru.pristal.link;

import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import org.bukkit.Bukkit;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;
import org.bukkit.plugin.java.JavaPlugin;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

public class PristalLink extends JavaPlugin implements CommandExecutor {
    private static final Pattern CODE = Pattern.compile("^[A-Z0-9]{4}-[A-Z0-9]{4}$");
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build();
    private final Map<UUID, Long> last = new ConcurrentHashMap<>();

    @Override
    public void onEnable() {
        saveDefaultConfig();
        String key = getConfig().getString("api-key", "");
        String url = getConfig().getString("api-url", "");
        if (key.isBlank() || key.equals("CHANGE_ME") || url.isBlank() || url.contains("ВАШ-АККАУНТ")) {
            getLogger().warning("Заполните api-url и api-key в plugins/PristalLink/config.yml, иначе /link работать не будет.");
        }
        getCommand("link").setExecutor(this);
    }

    @Override
    public boolean onCommand(CommandSender sender, Command cmd, String label, String[] args) {
        if (!(sender instanceof Player)) {
            sender.sendMessage("Эту команду можно выполнить только в игре.");
            return true;
        }
        Player p = (Player) sender;
        if (args.length != 1) {
            p.sendMessage("§eИспользование: §f/link <код> §7(код берётся на сайте, во вкладке «Профиль»)");
            return true;
        }
        String code = args[0].toUpperCase(Locale.ROOT);
        if (!CODE.matcher(code).matches()) {
            p.sendMessage("§cКод выглядит так: §fA7K9-P2MX");
            return true;
        }
        long now = System.currentTimeMillis();
        long cooldown = getConfig().getLong("cooldown-seconds", 3) * 1000L;
        Long prev = last.get(p.getUniqueId());
        if (prev != null && now - prev < cooldown) {
            p.sendMessage("§cПодождите пару секунд перед следующей попыткой.");
            return true;
        }
        last.put(p.getUniqueId(), now);

        if (getConfig().getBoolean("require-auth-plugin", false) && !isAuthenticated(p)) {
            p.sendMessage("§cСначала войдите в аккаунт на сервере (/login), потом повторите /link.");
            return true;
        }

        final String nick = p.getName(); // настоящий ник берётся здесь, на сервере, а не от клиента сайта
        final String uuid = p.getUniqueId().toString();
        final String url = getConfig().getString("api-url", "") + "/api/plugin/confirm";
        final String key = getConfig().getString("api-key", "");

        Bukkit.getScheduler().runTaskAsynchronously(this, () -> {
            boolean ok = false;
            String message;
            try {
                JsonObject body = new JsonObject();
                body.addProperty("code", code);
                body.addProperty("nick", nick);
                body.addProperty("uuid", uuid);
                HttpRequest req = HttpRequest.newBuilder(URI.create(url))
                        .timeout(Duration.ofSeconds(10))
                        .header("Content-Type", "application/json")
                        .header("X-Plugin-Key", key)
                        .POST(HttpRequest.BodyPublishers.ofString(body.toString()))
                        .build();
                HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
                JsonObject json = JsonParser.parseString(res.body()).getAsJsonObject();
                ok = json.has("ok") && json.get("ok").getAsBoolean();
                message = json.has("message") ? json.get("message").getAsString() : "Ошибка проверки кода.";
                if (res.statusCode() == 403) {
                    getLogger().warning("Сайт отклонил ключ плагина (403). Проверьте api-key.");
                    message = "Сервер привязки настроен неверно. Сообщите администрации.";
                }
            } catch (Exception e) {
                getLogger().warning("Не удалось связаться с сайтом: " + e.getMessage());
                message = "Сайт сейчас недоступен. Попробуйте позже.";
            }
            final boolean fOk = ok;
            final String fMsg = message;
            Bukkit.getScheduler().runTask(this, () -> p.sendMessage((fOk ? "§a" : "§c") + fMsg));
        });
        return true;
    }

    /** Мягкая проверка входа через AuthMe (если плагин установлен). Без AuthMe при require-auth-plugin: true — отказ. */
    private boolean isAuthenticated(Player p) {
        try {
            Class<?> api = Class.forName("fr.xephi.authme.api.v3.AuthMeApi");
            Object inst = api.getMethod("getInstance").invoke(null);
            return (boolean) api.getMethod("isAuthenticated", Player.class).invoke(inst, p);
        } catch (Throwable t) {
            return false;
        }
    }
}
