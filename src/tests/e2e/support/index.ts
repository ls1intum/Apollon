import './commands';

// real-events
import "cypress-real-events/support";

declare global {
    namespace Cypress {
      interface Chainable<Subject = any> {
        /**
         * Custom command to select DOM element by data-cy attribute.
         * @example cy.dataCy('greeting')
         */
         visitAndWait(delay?: number): Chainable<JQuery<HTMLElement>>
         selectModelType(typeToSelect: string): Chainable<JQuery<HTMLElement>>
         dragElementIntoCanvas(typeToSelect: number): Chainable<JQuery<HTMLElement>>
      }
    }
}
