# Shared Visualization Components Architecture

This document describes the architectural patterns and implementation details of the shared visualization components located in `src/app/shared/components/emotion-charts`. These components are designed to provide highly reactive, theme-aware, and dynamic data visualizations across the application.

## 1. Shared Component Philosophy

These components are implemented as **Standalone Components**, ensuring they are self-contained and easily imported into any feature module. They act as "Pure UI" components that transform raw data into complex visual configurations without maintaining external state.

### Key Characteristics:

- **Zero Side Effects**: Components do not fetch data; they only consume data provided via inputs.
- **Theme Awareness**: Built-in integration with global theme services to ensure visual consistency between light and dark modes.
- **Context Flexibility**: A single component can adapt its layout and visual density based on the provided "view mode" or "context" flags.

## 2. Signal-Driven Reactivity

The core of the component logic is built on **Angular Signals**, ensuring "instant" updates and optimal change detection.

### Reactive Inputs

Instead of traditional `@Input()` decorators, these components use the `input()` and `input.required()` signals. This allows for:

- **Type Safety**: Compile-time checking of required data shapes.
- **Read-Only Data Flow**: Ensuring that the visualizer does not mutate the source data.

```typescript
// Example of reactive inputs
data = input.required<DataStructure[]>();
viewType = input<string>("default");
customHeight = input<string>("300px");
```

### Computed Configuration

The most powerful feature of this architecture is the use of the `computed()` signal to generate the visualization engine's options.

Whenever any input signal (e.g., `data`, `viewType`) or injected reactive state (e.g., `themeService.currentTheme`) changes, the `computed` block automatically executes. This results in an **instantaneous visual update** without manual lifecycle hook management (like `ngOnChanges`).

```typescript
chartOptions = computed(() => {
  const currentData = this.data();
  const currentMode = this.viewType();
  const theme = this.themeService.getTheme();

  // Logic to transform data into engine-specific options
  return this.buildConfig(currentData, currentMode, theme);
});
```

## 3. Dynamic HTML Structure

The HTML templates are kept extremely minimal and dynamic. The template's primary responsibility is to Provide a responsive container and bind the computed options to the rendering engine.

### Layout Adaptability

The templates use Signal-based style binding to adjust dimensions and styles on the fly, allowing the same component to be used in a small dashboard card or a full-page analysis view.

```html
<!-- Example of a dynamic, signal-reactive template -->
<div class="chart-wrapper" [style.height]="viewType() === 'compact' ? '200px' : '450px'">
  <div visualizationEngine [options]="chartOptions()" [autoResize]="true"></div>
</div>
```

## 4. Summary for AI Agents

When interacting with or extending these components, follow these rules:

1. **Always use Signals**: All new inputs must be `input()` and all derived state must be `computed()`.
2. **Abstract Logic**: Keep the `computed` callback clean by delegating complex configuration building to private helper methods (e.g., `buildVerticalLayout`, `buildHorizontalLayout`).
3. **Inject Shared Services**: Use `inject(ThemeService)` and `inject(ColorService)` to ensure the visualization honors the global design system tokens.
4. **CSS-First Styling**: Use CSS variables for colors where possible, or retrieve theme tokens from services to keep the visualization engine in sync with the DOM styles.
