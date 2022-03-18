Cypress.Commands.add('dataCy', () => {
    return cy.get(`[data-cy=toll]`)
})
