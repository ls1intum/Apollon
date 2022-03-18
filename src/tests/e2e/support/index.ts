import './commands';

declare global {
    namespace Cypress {
      interface Chainable<Subject = any> {
        /**
         * Custom command to select DOM element by data-cy attribute.
         * @example cy.dataCy('greeting')
         */
        dataCy(): Chainable<JQuery<HTMLElement>>
      }
    }
}