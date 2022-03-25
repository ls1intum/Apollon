import './commands';

// real-events
import 'cypress-real-events/support';

declare global {
  namespace Cypress {
    interface Chainable<Subject = any> {
      visitAndWait(delay?: number): Chainable<JQuery<HTMLElement>>;
      selectModelType(typeToSelect: string): Chainable<JQuery<HTMLElement>>;
      dragElementIntoCanvas(typeToSelect: number): Chainable<JQuery<HTMLElement>>;
    }
  }
}
