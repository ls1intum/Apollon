Cypress.Commands.add('visitAndWait', (delay = 1000) => {
  cy.visit('/');
  cy.wait(delay);
});

Cypress.Commands.add('selectModelType', (typeToSelect) => {
  cy.get('[data-cy=select-type]').select(typeToSelect);
});

Cypress.Commands.add('dragElementIntoCanvas', (elementIndex) => {
  cy.get('[data-cy=modeling-editor-canvas]').should('be.visible');
  cy.get('[data-cy=modeling-editor-sidebar]').should('be.visible');
  cy.get('[data-cy=modeling-editor-sidebar]').children().eq(elementIndex).realMouseDown();
  cy.get('[data-cy=modeling-editor-canvas]').realHover().realMouseUp();
});
