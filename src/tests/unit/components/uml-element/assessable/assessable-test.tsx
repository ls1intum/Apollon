import * as React from 'react';
import { UMLClass } from '../../../../../main/packages/uml-class-diagram/uml-class/uml-class';
import { ModelState } from '../../../../../main/components/store/model-state';
import { DeepPartial } from 'redux';
import { UMLClassAttribute } from '../../../../../main/packages/uml-class-diagram/uml-class-attribute/uml-class-attribute';
import { UMLClassMethod } from '../../../../../main/packages/uml-class-diagram/uml-class-method/uml-class-method';
import { render } from '@testing-library/react';
import { UMLElementComponentProps } from '../../../../../main/components/uml-element/uml-element-component-props';
import { MockStoreEnhanced } from 'redux-mock-store';
import { Provider } from 'react-redux';
import { getMockedStore } from '../../../test-utils/test-utils';
import { assessable } from '../../../../../main/components/uml-element/assessable/assessable';
import { IAssessment } from '../../../../../main/services/assessment/assessment';
import { Theme } from '../../../../../main/components/theme/theme';
import { UMLClassInheritance } from '../../../../../main/packages/uml-class-diagram/uml-class-inheritance/uml-class-inheritance';

class MockComponent extends React.Component<UMLElementComponentProps> {
  render() {
    return (
      <svg>
        {this.props.children}
        <text>Mock Component</text>
      </svg>
    );
  }
}

describe('test assessable HOC', () => {
  let store: MockStoreEnhanced<DeepPartial<ModelState>, any>;
  let assessedElement: UMLClass;
  const AssessableMockComponent = assessable(MockComponent);
  let assessment: IAssessment;

  beforeEach(() => {
    assessedElement = new UMLClass({ name: 'test-element' });
    const umlClassAttribute = new UMLClassAttribute({
      name: 'attribute',
      owner: assessedElement.id,
    });
    const umlClassMethod = new UMLClassMethod({
      name: 'classMethod',
      owner: assessedElement.id,
    });
    assessedElement.ownedElements = [umlClassAttribute.id, umlClassMethod.id];
  });
  it('display positive score', () => {
    assessment = { score: 2, feedback: 'Great job!' };

    store = getMockedStore(
      {
        assessments: {
          [assessedElement.id]: assessment,
        },
      },
      [assessedElement],
    );
    const { baseElement } = render(
      <Provider store={store}>
        <Theme styles={undefined}>
          <AssessableMockComponent id={assessedElement.id} />
        </Theme>
      </Provider>,
    );
    expect(baseElement).toMatchSnapshot();
  });
  it('display negative score', () => {
    assessment = { score: -2, feedback: 'Bad job!' };

    store = getMockedStore(
      {
        assessments: {
          [assessedElement.id]: assessment,
        },
      },
      [assessedElement],
    );
    const { baseElement } = render(
      <Provider store={store}>
        <Theme styles={undefined}>
          <AssessableMockComponent id={assessedElement.id} />
        </Theme>
      </Provider>,
    );
    expect(baseElement).toMatchSnapshot();
  });
  it('display neutral score', () => {
    assessment = { score: 0, feedback: 'Okay!' };

    store = getMockedStore(
      {
        assessments: {
          [assessedElement.id]: assessment,
        },
      },
      [assessedElement],
    );
    const { baseElement } = render(
      <Provider store={store}>
        <Theme styles={undefined}>
          <AssessableMockComponent id={assessedElement.id} />
        </Theme>
      </Provider>,
    );
    expect(baseElement).toMatchSnapshot();
  });
  it('display warning icon for incorrect assessment for the path', () => {
    // Another assessment element and UML relationship definition.
    let assessedElementSubclass = new UMLClass({ name: 'subclass' });
    let relationship = new UMLClassInheritance({
      source: {
        element: assessedElement.id,
      },
      target: {
        element: assessedElementSubclass.id,
      },
    });
    assessment = { score: 1, feedback: 'Okay!', correctionStatus: { description: 'ABC', status: 'INCORRECT' } };

    store = getMockedStore(
      {
        assessments: {
          [relationship.id]: assessment,
        },
      },
      [assessedElement, assessedElementSubclass, relationship],
    );
    const { baseElement } = render(
      <Provider store={store}>
        <Theme styles={undefined}>
          <AssessableMockComponent id={assessedElement.id} />
        </Theme>
        <Theme styles={undefined}>
          <AssessableMockComponent id={assessedElementSubclass.id} />
        </Theme>
        <Theme styles={undefined}>
          <AssessableMockComponent id={relationship.id} />
        </Theme>
      </Provider>,
    );
    expect(baseElement).toMatchSnapshot();
  });
});
