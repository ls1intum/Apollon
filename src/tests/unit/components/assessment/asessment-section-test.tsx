import React, { createRef, RefObject } from 'react';
import { IUMLElement } from '../../../../main/services/uml-element/uml-element';
import { UMLClass } from '../../../../main/packages/uml-class-diagram/uml-class/uml-class';
import { UMLClassAttribute } from '../../../../main/packages/uml-class-diagram/uml-class-attribute/uml-class-attribute';
import { UMLClassMethod } from '../../../../main/packages/uml-class-diagram/uml-class-method/uml-class-method';
import { act, fireEvent, render } from '@testing-library/react';
import { AssessmentSection } from '../../../../main/components/assessment/assessment-section';
import { Theme } from '../../../../main/components/theme/theme';
import { I18nProvider } from '../../../../main/components/i18n/i18n-provider';
import { ModelStore, StoreProvider } from '../../../../main/components/store/model-store';
import { Locale } from '../../../../main';
import { IAssessment } from '../../../../main/services/assessment/assessment';

describe('test AssessmentSection', () => {
  const elements: IUMLElement[] = [];

  beforeEach(() => {
    const umlClass = new UMLClass({ name: 'test-element' });
    const umlClassAttribute = new UMLClassAttribute({
      name: 'attribute',
      owner: umlClass.id,
    });
    const umlClassMethod = new UMLClassMethod({
      name: 'classMethod',
      owner: umlClass.id,
    });
    umlClass.ownedElements = [umlClassAttribute.id, umlClassMethod.id];
    elements.push(umlClass, umlClassAttribute, umlClassMethod);
  });
  it('it can be rendered', () => {
    const { container } = render(
      <StoreProvider
        initialState={{
          elements: {
            [elements[0].id]: { ...elements[0] },
            [elements[1].id]: { ...elements[1] },
            [elements[2].id]: { ...elements[2] },
          },
        }}
      >
        <I18nProvider locale={Locale.en}>
          <Theme styles={undefined}>
            <AssessmentSection element={elements[0]} />
          </Theme>
        </I18nProvider>
      </StoreProvider>,
    );

    const sut = container.firstChild;
    expect(sut).not.toBeNull();
  });
  it('it can be scored', () => {
    const store: RefObject<ModelStore> = createRef();
    const elementToScore = elements[0];
    const score = 5;

    const { getByText } = render(
      <StoreProvider
        ref={store}
        initialState={{
          elements: {
            [elements[0].id]: { ...elements[0] },
            [elements[1].id]: { ...elements[1] },
            [elements[2].id]: { ...elements[2] },
          },
        }}
      >
        <I18nProvider locale={Locale.en}>
          <Theme styles={undefined}>
            <AssessmentSection element={elementToScore} />
          </Theme>
        </I18nProvider>
      </StoreProvider>,
    );

    // assumption: Textfield immediately after label
    const sut = getByText('Points:').nextSibling;
    if (!sut) {
      throw Error('SUT could not be found');
    }
    fireEvent.change(sut, {
      target: { value: score },
    });

    expect(Object.keys(store.current!.state.store.getState().assessments)).toHaveLength(1);
    expect(store.current!.state.store.getState().assessments[elementToScore.id].score).toEqual(score);
  });
  it('it can be given feedback', () => {
    const store: RefObject<ModelStore> = createRef();
    const elementToGiveFeedback = elements[0];
    const feedback = 'Nicely Done!';

    const { getByPlaceholderText } = render(
      <StoreProvider
        ref={store}
        initialState={{
          elements: {
            [elements[0].id]: { ...elements[0] },
            [elements[1].id]: { ...elements[1] },
            [elements[2].id]: { ...elements[2] },
          },
        }}
      >
        <I18nProvider locale={Locale.en}>
          <Theme styles={undefined}>
            <AssessmentSection element={elementToGiveFeedback} />
          </Theme>
        </I18nProvider>
      </StoreProvider>,
    );

    const sut = getByPlaceholderText('You can enter feedback here...');
    if (!sut) {
      throw Error('SUT could not be found');
    }
    act(() => {
      fireEvent.change(sut, {
        target: { value: feedback },
      });
    });

    expect(Object.keys(store.current!.state.store.getState().assessments)).toHaveLength(1);
    expect(store.current!.state.store.getState().assessments[elementToGiveFeedback.id].feedback).toEqual(feedback);
  });
  it('it can be deleted', () => {
    const store: RefObject<ModelStore> = createRef();
    const elementToDelete = elements[0];
    const { getByRole, getByPlaceholderText } = render(
      <StoreProvider
        ref={store}
        initialState={{
          elements: {
            [elements[0].id]: { ...elements[0] },
            [elements[1].id]: { ...elements[1] },
            [elements[2].id]: { ...elements[2] },
          },
        }}
      >
        <I18nProvider locale={Locale.en}>
          <Theme styles={undefined}>
            <AssessmentSection element={elementToDelete} />
          </Theme>
        </I18nProvider>
      </StoreProvider>,
    );

    // Trigger the creation of the new assessment.
    const feedback = getByPlaceholderText('You can enter feedback here...');
    act(() => {
      fireEvent.change(feedback, {
        target: { value: 'text' },
      });
    });

    // There should exist one assessment.
    let state = store.current!.state.store.getState();
    expect(Object.keys(state.assessments)).toHaveLength(1);

    const deleteButton = getByRole('button');
    act(() => {
      fireEvent.click(deleteButton);
    });

    // Upon deletion the assessment has to be removed.
    state = store.current!.state.store.getState();
    expect(Object.keys(state.assessments)).toHaveLength(0);
  });
  it('it should switch feedback placeholder when dropInfo is available', () => {
    const store: RefObject<ModelStore> = createRef();
    const elementToDelete = elements[0];
    const instruction = {
      feedback: 'default feedback from instruction',
    };
    const dropInfo = {
      instruction,
      tooltipMessage: 'message',
      removeMessage: 'remove message',
      feedbackHint: 'feedback tooltip',
    };
    const assessment = {
      score: 2,
      feedback: 'feedback',
      dropInfo,
    } as IAssessment;
    const { getByPlaceholderText, getByText } = render(
      <StoreProvider
        ref={store}
        initialState={{
          elements: {
            [elements[0].id]: { ...elements[0] },
            [elements[1].id]: { ...elements[1] },
            [elements[2].id]: { ...elements[2] },
          },
          assessments: {
            [elementToDelete.id]: assessment,
          },
        }}
      >
        <I18nProvider locale={Locale.en}>
          <Theme styles={undefined}>
            <AssessmentSection element={elementToDelete} />
          </Theme>
        </I18nProvider>
      </StoreProvider>,
    );

    const icon = getByText('Feedback').nextSibling;
    const helpButton = icon?.firstChild;
    const additionalFeedbackPlaceholder = getByPlaceholderText('You can enter additional feedback here...');

    expect(helpButton).not.toBeNull();
    expect(additionalFeedbackPlaceholder).not.toBeNull();
  });
});
