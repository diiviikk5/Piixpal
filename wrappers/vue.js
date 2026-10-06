/* Vue 3 plugin for Piixpal.
 *
 *   import { createApp } from 'vue'
 *   import Piixpal from 'piixpal/vue'      // or './wrappers/vue.js'
 *   createApp(App).use(Piixpal).mount('#app')
 *
 * Then use the tags directly in templates: <piix-pal pal="bitbug" />
 * With Vite, tell the compiler these are custom elements:
 *   vue({ template: { compilerOptions: { isCustomElement: tag => tag.startsWith('piix-') } } }) */
import { loadPiixpal } from './load.js';

export default {
  install(app, options = {}) {
    if (app.config.compilerOptions) {
      const prev = app.config.compilerOptions.isCustomElement;
      app.config.compilerOptions.isCustomElement = tag => tag.startsWith('piix-') || (prev ? prev(tag) : false);
    }
    loadPiixpal(options.src);
  }
};
export { loadPiixpal };
