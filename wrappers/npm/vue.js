/* Vue 3 plugin for Piixpal, from npm:
 *   import Piixpal from 'piixpal/vue'
 *   createApp(App).use(Piixpal).mount('#app')
 * Then use the tags in templates: <piix-pal pal="bitbug" />
 * With Vite, mark them as custom elements:
 *   vue({ template: { compilerOptions: { isCustomElement: tag => tag.startsWith('piix-') } } }) */
import { loadPiixpal } from './load.js';

export default {
  install(app) {
    if (app.config.compilerOptions) {
      const prev = app.config.compilerOptions.isCustomElement;
      app.config.compilerOptions.isCustomElement = tag => tag.startsWith('piix-') || (prev ? prev(tag) : false);
    }
    loadPiixpal();
  }
};
export { loadPiixpal };
