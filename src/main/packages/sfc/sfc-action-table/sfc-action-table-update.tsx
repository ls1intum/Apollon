import React, { ComponentClass, FunctionComponent, useRef, useState } from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';
import { Textfield } from '../../../components/controls/textfield/textfield';
import { ModelState } from '../../../components/store/model-state';
import { UMLElement } from '../../../services/uml-element/uml-element';
import { UMLElementRepository } from '../../../services/uml-element/uml-element-repository';
import { notEmpty } from '../../../utils/not-empty';
import { AsyncDispatch } from '../../../utils/actions/actions';
import { compose } from 'redux';
import { SfcActionTable } from './sfc-action-table';
import { SfcActionTableUpdateRowControls } from './sfc-action-table-update-row-controls';
import { SfcActionTableRow } from './sfc-action-table-row/sfc-action-table-row';

const Grid = styled.div`
  display: grid;
  grid-template-columns: 30px 1fr auto;
`;

interface OwnProps {
  element: SfcActionTable;
}

interface DispatchProps {
  create: typeof UMLElementRepository.create;
  update: typeof UMLElementRepository.update;
  delete: typeof UMLElementRepository.delete;
  getById: (id: string) => UMLElement | null;
}

type Props = OwnProps & DispatchProps;

const SfcActionTableUpdateComponent: FunctionComponent<Props> = ({
  element,
  create,
  update,
  delete: deleteElement,
  getById,
}) => {
  const [fieldToFocus, setFieldToFocus] = useState<Textfield<string> | null>(null);

  const newRowFirstCell = useRef<Textfield<string>>(null);
  const newRowSecondCell = useRef<Textfield<string>>(null);

  const labelRefs: (Textfield<string> | null)[] = [];

  const children = element.ownedElements.map((id) => getById(id)).filter(notEmpty);
  const rows = children.filter((child) => child instanceof SfcActionTableRow);
  const cellValues = rows.map((row) => JSON.parse(row.name));

  // Focus the field that was set to be focused
  React.useEffect(() => {
    if (fieldToFocus) {
      fieldToFocus.focus();
      setFieldToFocus(null);
    }
  }, [fieldToFocus]);

  function rename(rowId: string, rowIndex: number, colIndex: 0 | 1, cellValue: string): void {
    const otherColIndex = 1 - colIndex;
    const rowValue = [];
    rowValue[colIndex] = cellValue;
    rowValue[otherColIndex] = cellValues[rowIndex][otherColIndex] ?? '';
    update(rowId, { name: JSON.stringify(rowValue) });
  }

  function handleDelete(id: string): () => void {
    return () => deleteElement(id);
  }

  function createRow(): void {
    const firstInput = newRowFirstCell.current?.ref.current;
    const secondInput = newRowSecondCell.current?.ref.current;

    const firstCellValue = firstInput?.value ?? '';
    const secondCellValue = secondInput?.value ?? '';

    if (firstInput) {
      firstInput.value = '';
    }
    if (secondInput) {
      secondInput.value = '';
    }

    const rowValues = [firstCellValue, secondCellValue];
    const row = new SfcActionTableRow({ name: JSON.stringify(rowValues) });
    create(row, element.id);
  }

  return (
    <div>
      <section>
        <Grid>
          {rows.map((row, index) => (
            <React.Fragment key={row.id}>
              <Textfield
                id={'first' + row.id}
                key={'first' + row.id}
                ref={(ref) => (labelRefs[2 * index] = ref)}
                value={cellValues[index][0]}
                onChange={(value) => rename(row.id, index, 0, value)}
                onSubmitKeyUp={() => setFieldToFocus(labelRefs[2 * index + 1])}
              />
              <Textfield
                id={'second' + row.id}
                key={'second' + row.id}
                ref={(ref) => (labelRefs[2 * index + 1] = ref)}
                value={cellValues[index][1]}
                onChange={(value) => rename(row.id, index, 1, value)}
                onSubmitKeyUp={() =>
                  index === rows.length - 1
                    ? newRowFirstCell.current?.focus()
                    : setFieldToFocus(labelRefs[2 * index + 2])
                }
              />
              <SfcActionTableUpdateRowControls row={row as UMLElement} update={update} onDelete={handleDelete} />
            </React.Fragment>
          ))}
        </Grid>

        <Grid>
          <Textfield
            ref={newRowFirstCell}
            outline
            value=""
            onSubmitKeyUp={() => setFieldToFocus(newRowSecondCell.current)}
          />

          <Textfield
            ref={newRowSecondCell}
            outline
            value=""
            onSubmit={createRow}
            onSubmitKeyUp={(key: string, value: string) => {
              if (value) {
                setFieldToFocus(newRowFirstCell.current);
              }
            }}
          />
          <div />
        </Grid>
      </section>
    </div>
  );
};

const enhance = compose<ComponentClass<OwnProps>>(
  connect<{}, DispatchProps, OwnProps, ModelState>(null, {
    create: UMLElementRepository.create,
    update: UMLElementRepository.update,
    delete: UMLElementRepository.delete,
    getById: UMLElementRepository.getById as any as AsyncDispatch<typeof UMLElementRepository.getById>,
  }),
);

/**
 * Component for editing rows in a sfc action table.
 * Provides a grid interface for adding, editing, and deleting action rows.
 */
export const SfcActionTableUpdate = enhance(SfcActionTableUpdateComponent);
