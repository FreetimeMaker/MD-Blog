const button = document.querySelector('.theme-toggle');
try { document.body.classList.toggle('dark-mode', localStorage.getItem('theme') === 'dark'); } catch {}
function syncTheme() { button.setAttribute('aria-pressed', String(document.body.classList.contains('dark-mode'))); }
syncTheme();
button.addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    try { localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light'); } catch {}
    syncTheme();
});
            function formatRelativeTime(date, locale) {
                const diffMs = date.getTime() - Date.now();
                const rtf = new Intl.RelativeTimeFormat(locale, {
                    numeric: "auto",
                });
                const seconds = Math.round(diffMs / 1000);

                if (Math.abs(seconds) < 60) {
                    return rtf.format(seconds, "second");
                }

                const minutes = Math.round(seconds / 60);
                if (Math.abs(minutes) < 60) {
                    return rtf.format(minutes, "minute");
                }

                const hours = Math.round(minutes / 60);
                if (Math.abs(hours) < 24) {
                    return rtf.format(hours, "hour");
                }

                const days = Math.round(hours / 24);
                if (Math.abs(days) < 30) {
                    return rtf.format(days, "day");
                }

                const months = Math.round(days / 30);
                if (Math.abs(months) < 12) {
                    return rtf.format(months, "month");
                }

                const years = Math.round(days / 365);
                return rtf.format(years, "year");
            }

            function formatDiscordTimestamp(element) {
                const timestamp = Number(element.dataset.timestamp);
                const style = element.dataset.style || "f";

                if (!Number.isFinite(timestamp) || !Number.isFinite(new Date(timestamp * 1000).getTime())) {
                    return;
                }

                const date = new Date(timestamp * 1000);
                const locale = navigator.language || "en";

                const formats = {
                    t: { hour: "2-digit", minute: "2-digit" },
                    T: {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                    },
                    d: { year: "numeric", month: "2-digit", day: "2-digit" },
                    D: { year: "numeric", month: "long", day: "numeric" },
                    f: {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                    },
                    F: {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                    },
                };

                if (style === "R") {
                    element.textContent = formatRelativeTime(date, locale);
                } else {
                    element.textContent = new Intl.DateTimeFormat(
                        locale,
                        formats[style] || formats.f,
                    ).format(date);
                }

                element.dateTime = date.toISOString();
                element.title = date.toLocaleString(locale);
            }

            export function updateDiscordTimestamps() {
                document
                    .querySelectorAll(".discord-timestamp")
                    .forEach(formatDiscordTimestamp);
            }


updateDiscordTimestamps();
setInterval(updateDiscordTimestamps, 30000);
