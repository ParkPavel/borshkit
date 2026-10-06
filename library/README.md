---
bk-type: reference
related: ["../docs/concepts/roles-and-skills.md", "../docs/ingredients.md"]
---
# Библиотека: навыки и проверенные ссылки

Здесь две вещи:

1. **Пакеты навыков** — тексты с опытом других проектов, скопированные в `packs/` с лицензиями. Роль получает только свои навыки; другие можно добавить к работе флагом `--навыки пакет/навык`.
2. **Каталог ссылок** — первоисточники для фронтенда, дизайна и доступности. Роли получают ссылки из своей части каталога и сверяются с ними, а не с памятью модели.

> Каждая ссылка проверена 2026-10-06: страницы — ответом 200, репозитории GitHub — клонированием, лицензия прочитана из файла LICENSE. «Не указана» — в репозитории нет файла лицензии (license: none); «на сайте» — условия на самом сайте (see-site). Отклонённые кандидаты и причины — в [`catalog.json`](catalog.json), поле `rejected`.

В терминале: `borshkit навыки` и `borshkit библиотека [категория]`.

> Файл собирается командой `node scripts/library.mjs` из `catalog.json` и `packs/*/pack.json`. Не правь его руками.

## Пакеты навыков

### Фронтенд-навыки ECC

Источник: [affaan-m/ECC](https://github.com/affaan-m/ECC) @ `ef648e0` · лицензия MIT ([текст](../packs/ecc/LICENSE)) · [поддержать автора](https://github.com/sponsors/affaan-m)

| Навык | Когда нужен | Роли |
|---|---|---|
| [`ecc/accessibility`](../packs/ecc/skills/accessibility/SKILL.md) | доступность по WCAG 2.2 AA для веба, iOS и Android | `a11y-reviewer` |
| [`ecc/frontend-a11y`](../packs/ecc/skills/frontend-a11y/SKILL.md) | доступность в React и Next.js: формы, модальные окна, фокус, клавиатура | `a11y-reviewer` |
| [`ecc/frontend-design-direction`](../packs/ecc/skills/frontend-design-direction/SKILL.md) | выбрать визуальное направление для интерфейса продукта | `ui-engineer` |
| [`ecc/make-interfaces-feel-better`](../packs/ecc/skills/make-interfaces-feel-better/SKILL.md) | отступы, шрифты, тени, области нажатия, состояния | `ui-engineer` |
| [`ecc/liquid-glass-design`](../packs/ecc/skills/liquid-glass-design/SKILL.md) | материал Liquid Glass в iOS 26: SwiftUI, UIKit, WidgetKit | `ios-designer` |
| [`ecc/swiftui-patterns`](../packs/ecc/skills/swiftui-patterns/SKILL.md) | архитектура SwiftUI: состояние, навигация, производительность | `ios-designer` |
| [`ecc/motion-foundations`](../packs/ecc/skills/motion-foundations/SKILL.md) | основа анимаций в React: токены, пружины, reduced motion | `motion-reviewer` |
| [`ecc/motion-patterns`](../packs/ecc/skills/motion-patterns/SKILL.md) | готовые анимации в React: модальные окна, списки, переходы | по запросу |
| [`ecc/react-patterns`](../packs/ecc/skills/react-patterns/SKILL.md) | React 18/19: хуки, серверные компоненты, Suspense, формы | по запросу |

### Дизайн-инженерия и анимация (Emil Kowalski)

Источник: [emilkowalski/skills](https://github.com/emilkowalski/skills) @ `e8a175d` · лицензия MIT ([текст](../packs/emil/LICENSE))

| Навык | Когда нужен | Роли |
|---|---|---|
| [`emil/emil-design-eng`](../packs/emil/skills/emil-design-eng/SKILL.md) | главный навык: полировка интерфейса, решения об анимации, мелкие детали | `ui-engineer` |
| [`emil/animate`](../packs/emil/skills/animate/SKILL.md) | сделать анимацию с нуля: стоит ли анимировать, кривая, длительность, прерывание | по запросу |
| [`emil/animate-expo`](../packs/emil/skills/animate-expo/SKILL.md) | анимации в React Native и Expo: жесты, шторки, отклик | по запросу |
| [`emil/review-animations`](../packs/emil/skills/review-animations/SKILL.md) | строгое ревью анимаций | `motion-reviewer` |
| [`emil/improve-animations`](../packs/emil/skills/improve-animations/SKILL.md) | аудит всех анимаций проекта и планы исправлений | по запросу |
| [`emil/find-animation-opportunities`](../packs/emil/skills/find-animation-opportunities/SKILL.md) | где анимация нужна, а где нет | по запросу |
| [`emil/animation-vocabulary`](../packs/emil/skills/animation-vocabulary/SKILL.md) | словарь: как точно назвать эффект | `motion-reviewer` |
| [`emil/apple-design`](../packs/emil/skills/apple-design/SKILL.md) | принципы Apple: жесты, пружины, прерываемые переходы, материалы | `ios-designer` |
| [`emil/write-swift`](../packs/emil/skills/write-swift/SKILL.md) | современный Swift: типы-значения, параллельность Swift 6, тесты | по запросу |
| [`emil/pick-ui-library`](../packs/emil/skills/pick-ui-library/SKILL.md) | какую библиотеку взять под задачу интерфейса | `ui-engineer` |
| [`emil/prototype`](../packs/emil/skills/prototype/SKILL.md) | несколько разных вариантов интерфейса с переключателем | по запросу |
| [`emil/mobile-native`](../packs/emil/skills/mobile-native/SKILL.md) | веб-приложение на телефоне как родное: 100vh, нажатия, безопасные зоны | по запросу |
| [`emil/break-ui`](../packs/emil/skills/break-ui/SKILL.md) | сломать интерфейс худшими данными: длинные имена, пустые списки, эмодзи | `designer` |
| [`emil/ask-sonner`](../packs/emil/skills/ask-sonner/SKILL.md) | уведомления-тосты на Sonner | по запросу |

### Ленивый сеньор (Ponytail)

Источник: [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail) @ `552acd5` · лицензия MIT ([текст](../packs/ponytail/LICENSE)) · [поддержать автора](https://github.com/sponsors/DietrichGebert)

| Навык | Когда нужен | Роли |
|---|---|---|
| [`ponytail/ponytail`](../packs/ponytail/SKILL.md) | сделать минимально и просто; уровень задаёт флаг --линза | `implementer` |
| [`ponytail/ponytail-review`](../packs/ponytail/REVIEW.md) | ревью лишней сложности | `simplicity-reviewer` |

## Каталог ссылок

### Навыки для агентов

| Что | Зачем | Лицензия | Роли |
|---|---|---|---|
| [Emil Kowalski Skills](https://github.com/emilkowalski/skills) | Навыки, чтобы решать, делать и проверять анимации и полировку интерфейса; есть отдельные для Expo, Swift и Sonner. | MIT | — |
| [Apple HIG Agent Skill](https://github.com/justinwetch/HIGAgentSkills) | Сжатые Apple HIG для iOS, iPadOS, macOS, tvOS, visionOS и watchOS с точными значениями и правилами Apple. | не указана | `ios-designer` |
| [Anthropic frontend-design skill](https://github.com/anthropics/skills/tree/main/skills/frontend-design) | Навык, который заставляет агента выбрать осознанное визуальное направление, шрифты и сетку вместо шаблонных решений. | Apache-2.0 | — |
| [Vercel Agent Skills](https://github.com/vercel-labs/agent-skills) | Навыки про производительность React, композицию компонентов, React Native и проверку интерфейса по правилам Vercel. | не указана | — |
| [Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines) | Список конкретных правил для веб-интерфейса: клавиатура, фокус, области нажатия, формы, анимация, скорость. | MIT | `ui-engineer` |
| [ECC skills (frontend subset)](https://github.com/affaan-m/ECC/tree/main/skills) | Большая коллекция навыков; для интерфейса — frontend-patterns, accessibility, design-system, motion-*, swiftui-patterns, liquid-glass-design. | MIT | — |
| [Impeccable](https://github.com/pbakaus/impeccable) | Навык и команды по дизайну для агентов плюс правила, которые находят типичные визуальные ошибки сгенерированных интерфейсов. | Apache-2.0 | — |
| [SwiftUI Pro (Paul Hudson)](https://github.com/twostraws/SwiftUI-Agent-Skill) | Навык, который ведёт агента к современным API SwiftUI для навигации, раскладки, анимации, состояния и VoiceOver. | MIT | — |
| [SwiftUI Expert Skill (Antoine van der Lee)](https://github.com/AvdLee/SwiftUI-Agent-Skill) | Справочники по SwiftUI: состояние, композиция представлений, скорость списков и прокрутки, Liquid Glass. | MIT | — |
| [Expo Skills](https://github.com/expo/skills) | Официальные навыки Expo: Expo Router, родной интерфейс, анимация, сборки EAS, обновления SDK. | MIT | — |

### Компоненты интерфейса

| Что | Зачем | Лицензия | Роли |
|---|---|---|---|
| [shadcn/ui](https://github.com/shadcn-ui/ui) | Компоненты React, которые копируются в проект; построены на Radix/Base UI и Tailwind, есть CLI и реестр. | MIT | `ui-engineer` |
| [Radix Primitives](https://github.com/radix-ui/primitives) | Доступные компоненты React без стилей (диалог, всплывающее окно, меню, вкладки), которые сами управляют фокусом и клавиатурой. | MIT | `ui-engineer` |
| [React Aria (Adobe React Spectrum monorepo)](https://github.com/adobe/react-spectrum) | Хуки и компоненты Adobe без стилей для доступного React: клавиатура, программы чтения с экрана, локализация. | Apache-2.0 | `ui-engineer` |
| [Base UI](https://github.com/mui/base-ui) | Доступные компоненты React без стилей от авторов Radix, Floating UI и MUI. | MIT | — |
| [Headless UI](https://github.com/tailwindlabs/headlessui) | Доступные компоненты React и Vue без стилей, созданные для работы с Tailwind CSS. | MIT | — |
| [Ark UI](https://github.com/chakra-ui/ark) | Компоненты без стилей на конечных автоматах Zag.js для React, Solid, Vue и Svelte. | MIT | — |
| [Sonner](https://github.com/emilkowalski/sonner) | Уведомления-тосты для React со стопкой и закрытием смахиванием. | MIT | — |
| [cmdk](https://github.com/pacocoursey/cmdk) | Командное меню (Cmd+K) для React без стилей, с встроенным поиском. | MIT | — |

### Анимация

| Что | Зачем | Лицензия | Роли |
|---|---|---|---|
| [Motion (formerly Framer Motion)](https://github.com/motiondivision/motion) | Библиотека анимации для React, JavaScript и Vue: пружины, жесты, анимация раскладки и исчезновения. | MIT | `motion-reviewer`, `ui-engineer` |
| [GSAP](https://github.com/greensock/GSAP) | Анимация на временной шкале для CSS, SVG и canvas в любом фреймворке, плюс плагины прокрутки. Лицензия не открытая. | GSAP Standard (не открытая) | — |
| [React Native Reanimated](https://github.com/software-mansion/react-native-reanimated) | Анимации React Native в потоке интерфейса, включая переходы раскладки и общих элементов. | MIT | — |
| [Lottie (web)](https://github.com/airbnb/lottie-web) | Проигрывает в браузере анимации After Effects, сохранённые в JSON; есть версии для iOS, Android и React Native. | MIT | — |
| [AutoAnimate](https://github.com/formkit/auto-animate) | Анимация добавления, удаления и перемещения элементов списка одной строкой, в любом фреймворке. | MIT | — |
| [View Transition API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API) | Справочник по встроенному в браузер View Transition API: анимация между состояниями страницы и переходами. | на сайте | `motion-reviewer` |
| [Apple HIG: Motion](https://developer.apple.com/design/human-interface-guidelines/motion) | Правила Apple: когда и как анимировать, и как уважать настройку «Уменьшение движения». | на сайте | `ios-designer`, `motion-reviewer` |

### iOS, Android и мобильные

| Что | Зачем | Лицензия | Роли |
|---|---|---|---|
| [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/) | Официальные правила дизайна Apple: компоненты, раскладка, типографика, поведение платформ. | на сайте | `designer`, `ios-designer` |
| [SwiftUI documentation](https://developer.apple.com/documentation/swiftui) | Справочник API и уроки Apple по интерфейсам на SwiftUI. | на сайте | `ios-designer` |
| [Liquid Glass (Apple Developer)](https://developer.apple.com/documentation/technologyoverviews/liquid-glass) | Обзор материала Liquid Glass от Apple и как перейти на него в SwiftUI, UIKit и AppKit. | на сайте | `ios-designer` |
| [Apple Design Resources](https://developer.apple.com/design/resources/) | Официальные наборы интерфейса для Figma и Sketch, шаблоны и рамки устройств Apple. | на сайте | `readme-designer` |
| [Expo](https://github.com/expo/expo) | Фреймворк и SDK для приложений на React Native: маршрутизация по файлам, родные модули, сборки в облаке. | MIT | — |
| [React Native](https://github.com/facebook/react-native) | Фреймворк Meta для родных приложений iOS и Android на React. | MIT | — |
| [Jetpack Compose](https://developer.android.com/compose) | Документация Google по декларативному интерфейсу Android, включая компоненты и темы Material 3. | на сайте | — |

### Дизайн-системы

| Что | Зачем | Лицензия | Роли |
|---|---|---|---|
| [Material Design 3](https://m3.material.io/) | Дизайн-система Google: компоненты, цвет, шрифт, движение, раскладка для Android, веба и Flutter. | на сайте | `designer`, `motion-reviewer` |
| [Fluent 2](https://fluent2.microsoft.design/) | Дизайн-система Microsoft и описания компонентов для веба, Windows, iOS и Android. | на сайте | — |
| [IBM Carbon](https://carbondesignsystem.com/) | Открытая дизайн-система IBM: компоненты, токены, визуализация данных, доступность. | на сайте | — |
| [GitHub Primer](https://primer.style/) | Дизайн-система GitHub: компоненты React, CSS, токены, иконки Octicons. | на сайте | `readme-designer` |
| [GOV.UK Design System](https://design-system.service.gov.uk/) | Компоненты и шаблоны правительства Великобритании, проверенные исследованиями; сильные разделы о формах и доступности. | на сайте | `designer` |
| [Atlassian Design System](https://atlassian.design/) | Основы, токены, компоненты и правила текстов Atlassian. | на сайте | — |
| [Shopify Polaris](https://shopify.dev/docs/api/polaris) | Актуальная Polaris от Shopify (веб-компоненты) для интерфейсов админки и приложений Shopify. | на сайте | — |

### Доступность

| Что | Зачем | Лицензия | Роли |
|---|---|---|---|
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | Стандарт W3C с проверяемыми критериями доступности веб-содержимого. | на сайте | `a11y-reviewer`, `ui-engineer` |
| [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/) | Шаблоны W3C: какое поведение клавиатуры и какие роли ARIA нужны меню, вкладкам, диалогам. | на сайте | `a11y-reviewer`, `ui-engineer` |
| [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility) | Руководства MDN и справочник ARIA по доступным веб-страницам. | на сайте | `a11y-reviewer` |
| [axe-core](https://github.com/dequelabs/axe-core) | Движок правил доступности для браузера и тестов: автоматически находит нарушения WCAG. | MPL-2.0 | `a11y-reviewer`, `tester` |
| [Inclusive Components](https://inclusive-components.design/) | Статьи Heydon Pickering о том, как сделать доступными переключатели, меню, вкладки, карточки. | на сайте | `a11y-reviewer` |

### Стили и токены

| Что | Зачем | Лицензия | Роли |
|---|---|---|---|
| [Tailwind CSS](https://github.com/tailwindlabs/tailwindcss) | CSS-фреймворк из утилит; тема — токены дизайна, заданные в CSS. | MIT | — |
| [Design Tokens Format Module 2025.10](https://www.designtokens.org/tr/2025.10/format/) | Спецификация группы W3C: формат JSON для обмена токенами дизайна между инструментами. | на сайте | `ui-engineer` |
| [Open Props](https://github.com/argyleink/open-props) | Готовые CSS-переменные: цвета, отступы, шрифты, тени, кривые и анимации. | MIT | — |
| [Radix Colors](https://github.com/radix-ui/colors) | Шкалы цветов из 12 ступеней, светлые и тёмные, рассчитанные на доступный контраст. | MIT | — |
| [Utopia](https://utopia.fyi/) | Калькуляторы плавных шкал шрифта и отступов на CSS clamp(). | на сайте | — |

### Иконки и шрифты

| Что | Зачем | Лицензия | Роли |
|---|---|---|---|
| [Lucide](https://github.com/lucide-icons/lucide) | Единый набор контурных SVG-иконок с пакетами для React, Vue, Svelte и других. | ISC | `readme-designer` |
| [Phosphor Icons](https://github.com/phosphor-icons/homepage) | Семейство иконок в шести начертаниях — от тонкого до двухцветного. | MIT | — |
| [Heroicons](https://github.com/tailwindlabs/heroicons) | SVG-иконки в контурном и залитом стилях от команды Tailwind CSS. | MIT | — |
| [SF Symbols](https://developer.apple.com/sf-symbols/) | Библиотека иконок Apple и приложение к ней; иконки согласованы со шрифтом San Francisco. | на сайте | `ios-designer` |
| [Inter](https://github.com/rsms/inter) | Шрифт для экранов, часто используется в интерфейсах. | OFL-1.1 | — |
| [Geist](https://github.com/vercel/geist-font) | Шрифты Vercel — без засечек и моноширинный — для интерфейсов и кода. | OFL-1.1 | — |

### Проверка качества

| Что | Зачем | Лицензия | Роли |
|---|---|---|---|
| [Storybook](https://github.com/storybookjs/storybook) | Мастерская, где компоненты собирают, описывают и тестируют по отдельности. | MIT | — |
| [Playwright](https://github.com/microsoft/playwright) | Автоматизация браузера и сквозные тесты в Chromium, Firefox и WebKit, со сравнением скриншотов. | Apache-2.0 | `tester` |
| [Lighthouse](https://github.com/GoogleChrome/lighthouse) | Аудит страницы: скорость, доступность, SEO, лучшие практики — из CLI или Chrome DevTools. | Apache-2.0 | `tester` |
| [Core Web Vitals (web.dev)](https://web.dev/articles/vitals) | Что такое LCP, INP и CLS, их пороги и как их измерять. | на сайте | — |

### Учиться

| Что | Зачем | Лицензия | Роли |
|---|---|---|---|
| [Learn CSS (web.dev)](https://web.dev/learn/css) | Бесплатный курс по CSS: блочная модель, раскладка, каскад, цвет и другое. | на сайте | — |
| [MDN Web Docs](https://developer.mozilla.org/en-US/) | Справочник по HTML, CSS и веб-API с таблицами поддержки браузерами. | на сайте | — |
| [Refactoring UI (paid)](https://www.refactoringui.com/) | Платная книга с практичными приёмами визуального дизайна для разработчиков: иерархия, отступы, цвет, глубина. **Платно.** | на сайте | — |
| [Laws of UX](https://lawsofux.com/) | Короткие описания психологических принципов (законы Фиттса, Хика, Якоба и др.) в дизайне интерфейсов. | на сайте | `designer` |
