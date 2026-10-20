const repo = 'https://github.com/ParkPavel/borshkit/blob/main/';
const data = {
  current: [
    ['Контракт задачи', 'Цель становится проверяемой', 'Цель, границы файлов и критерии записаны в контракт. База фиксирует, от какой версии началась задача; --база позволяет выбрать коммит или ветку.', 'core/contract.mjs', 'Без критериев красивый ответ агента не доказывает, что задача выполнена.'],
    ['Контекст и знания', 'Важное — рядом с задачей', 'Роли, навыки, знания проекта и ограниченный diff помогают исполнителю понять работу. Новые текстовые файлы входят в пакет ревью внутри границ задачи.', 'core/jobs.mjs', 'Пакет ограничен. Пропущенное и обрезанное требует дополнительного чтения; карта кода пока понимает JS/TS и Markdown.'],
    ['Исполнители', 'Среда меняется. Задача остаётся.', 'Borshkit запускает Claude Code, Codex, Gemini и API-исполнителей. Пишущий агент в Git-проекте получает отдельную рабочую копию.', 'core/adapters.mjs', 'Copilot, Roo и Cline получают экспорт инструкций. Это не нативное управление их сеансами.'],
    ['Проверки и приёмка', 'Результат с доказательствами', 'Команды проверок, независимое ревью и ручные подтверждения записываются отдельно. Доказательства относятся к точному состоянию файлов.', 'core/accept.mjs', 'Сбой запуска — UNKNOWN. Изменение файлов может сделать прежний PASS устаревшим. Ответ модели сам не принимает задачу.'],
    ['Передача работы', 'Продолжить без потери решений', 'При критической остановке сохраняется handoff. Явные файлы можно перенести с контролем целостности; настройки на другой машине предлагаются заново.', 'core/portable.mjs', 'Активный сеанс, ключи, процессы и доверенная приёмка между машинами не переносятся.']
  ],
  target: [
    ['Единый пакет задачи', 'Одна схема для разных харнесов', 'План: версионированный пакет цели, базы, решений, доказательств и неизвестного для продолжения работы в другой среде.', 'docs/roadmap.md', 'ПЛАН · Критерий готовности: проверяемый перенос и round-trip без потери происхождения данных.'],
    ['Сжатие контекста', 'Меньше текста, сохранённый смысл', 'План: сборка контекста под бюджет конкретной модели, со ссылками на источники и явным перечнем пропусков.', 'docs/roadmap.md', 'ПЛАН · Сегодня есть ограниченные пакеты и ручной шаблон handoff; универсального сжатия ещё нет.'],
    ['Нативные интеграции', 'Более глубокая связь со средой', 'План: поддерживаемые адаптеры управления работами Copilot, Roo и Cline, с проверками отмены, полномочий и версии API.', 'docs/roadmap.md', 'ПЛАН · Экспорт файлов инструкций уже есть, но он не заменяет API интеграцию.'],
    ['Проверенная переносимость', 'Доказанная польза в реальной работе', 'План: воспроизводимые сравнения живых моделей, расширение языков карты кода и проверка разных устройств.', 'docs/roadmap.md', 'ПЛАН · Тесты протокола с поддельным исполнителем не доказывают качество модели. Даты пока не назначены.']
  ]
};
let mode = 'current';
const layers = document.querySelector('#layers');
function select(index) {
  const item = data[mode][index];
  layers.querySelectorAll('button').forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
  document.querySelector('#layer-meta').textContent = `${mode === 'current' ? 'РЕАЛИЗОВАНО' : 'ПЛАН'} / ${String(index + 1).padStart(2, '0')}`;
  document.querySelector('#layer-title').textContent = item[1];
  document.querySelector('#layer-description').textContent = item[2];
  document.querySelector('#layer-link').href = repo + item[3];
  document.querySelector('#layer-link').textContent = mode === 'current' ? 'Посмотреть реализацию' : 'Открыть дорожную карту';
  document.querySelector('#layer-boundary').textContent = item[4];
}
function render() {
  layers.replaceChildren(...data[mode].map((item, index) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'layer';
    const name = document.createElement('span');
    const number = document.createElement('span'); number.textContent = String(index + 1).padStart(2, '0');
    name.append(number, item[0]);
    button.append(name); button.addEventListener('click', () => select(index));
    return button;
  }));
  select(0);
}
document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => {
  mode = button.dataset.mode;
  document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
  render();
}));
document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => {
  const text = document.getElementById(button.dataset.copy).textContent;
  try {
    await navigator.clipboard.writeText(text);
    document.querySelector('#copy-status').textContent = 'Команды скопированы';
    button.textContent = 'Скопировано';
    setTimeout(() => { button.textContent = 'Копировать'; }, 2500);
  } catch {
    document.querySelector('#copy-status').textContent = 'Копирование недоступно. Выдели команды в блоке и скопируй вручную.';
    button.textContent = 'Выдели текст';
  }
}));
render();
