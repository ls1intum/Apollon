import React from 'react';
import { IUMLElement } from '../../../../main/services/uml-element/uml-element';
import { UMLClass } from '../../../../main/packages/uml-class-diagram/uml-class/uml-class';
import { UMLClassAttribute } from '../../../../main/packages/uml-class-diagram/uml-class-attribute/uml-class-attribute';
import { UMLClassMethod } from '../../../../main/packages/uml-class-diagram/uml-class-method/uml-class-method';
import { act, fireEvent, render } from '@testing-library/react';
import { AssessmentDropInfoTooltip } from '../../../../main/components/assessment/assessment-dropInfo-tooltip';
import { Theme } from '../../../../main/components/theme/theme';
import { I18nProvider } from '../../../../main/components/i18n/i18n-provider';
import { StoreProvider } from '../../../../main/components/store/model-store';
import { Locale } from '../../../../main';
import { IAssessment } from '../../../../main/services/assessment/assessment';

describe('test AssessmentDropInfoTooltip', () => {
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
  it('it can be rendered if editor is not readonly', () => {
    const dropInfo = {
      instruction: 'Assessment Instruction',
      tooltipMessage: 'message',
      removeMessage: 'remove message',
    };
    const assessment = {
      score: 2,
      feedback: 'feedback',
      dropInfo,
    } as IAssessment;
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
            <AssessmentDropInfoTooltip element={elements[0]} assessment={assessment} readonly={false} />
          </Theme>
        </I18nProvider>
      </StoreProvider>,
    );

    const sut = container.firstChild;
    expect(sut).not.toBeNull();
  });
  it('it can be rendered if editor is readonly', () => {
    const dropInfo = {
      instruction: 'Assessment Instruction',
      tooltipMessage: 'message',
      removeMessage: 'remove message',
    };
    const assessment = {
      score: 2,
      feedback: 'feedback',
      dropInfo,
    } as IAssessment;
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
            <AssessmentDropInfoTooltip element={elements[0]} assessment={assessment} readonly />
          </Theme>
        </I18nProvider>
      </StoreProvider>,
    );

    const sut = container.firstChild;
    expect(sut).not.toBeNull();
  });
  it('it should display delete button after clicking link icon', () => {
    const dropInfo = {
      instruction: 'Assessment Instruction',
      tooltipMessage: 'message',
      removeMessage: 'remove message',
    };
    const assessment = {
      score: 2,
      feedback: 'feedback',
      dropInfo,
    } as IAssessment;

    const { getByRole, getByText } = render(
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
            <AssessmentDropInfoTooltip element={elements[0]} assessment={assessment} readonly={false} />
          </Theme>
        </I18nProvider>
      </StoreProvider>,
    );

    const linkButton = getByRole('button');
    const displayedMessage = getByText(dropInfo.tooltipMessage);
    expect(displayedMessage).not.toBeNull();

    act(() => {
      fireEvent.click(linkButton);
    });

    const deleteButton = getByRole('button');

    act(() => {
      fireEvent.click(deleteButton);
    });
    const updatedMessage = getByText(dropInfo.removeMessage);
    expect(updatedMessage).not.toBeNull();
  });
});
