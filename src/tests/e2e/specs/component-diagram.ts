describe('component-diagram', () => {
    beforeEach(() => {
        cy.visitAndWait();
        cy.selectModelType('ComponentDiagram');
    })
  
    it('drags-element-into-canvas', () => {
        cy.dragElementIntoCanvas(1);
        cy.get('[data-cy=modeling-editor-canvas]').get('[data-cy=uml-component]').should('be.visible');
    });
});
