import { desktopConfig } from 'lighthouse'

const onlyCategories = ['performance', 'accessibility', 'best-practices', 'seo']
export default {
  runs: 3,
  pages: [{ name: 'inicio', path: '/' }, { name: 'detalhe', path: '/mercado' }],
  thresholds: { performance: 90, accessibility: 95, 'best-practices': 95, seo: 90 },
  profiles: {
    mobile: { extends: 'lighthouse:default', settings: { onlyCategories, locale: 'pt-BR', formFactor: 'mobile', screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 1.75, disabled: false } } },
    desktop: { ...desktopConfig, settings: { ...desktopConfig.settings, onlyCategories, locale: 'pt-BR', screenEmulation: { mobile: false, width: 1440, height: 900, deviceScaleFactor: 1, disabled: false } } },
  },
}
