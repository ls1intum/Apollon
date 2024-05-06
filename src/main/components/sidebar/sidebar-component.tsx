import React, { Component, ComponentClass } from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { EditorRepository } from '../../services/editor/editor-repository';
import { ApollonMode, ApollonView } from '../../services/editor/editor-types';
import { CreatePane } from '../create-pane/create-pane';
import { I18nContext } from '../i18n/i18n-context';
import { localized } from '../i18n/localized';
import { ModelState } from '../store/model-state';
import { Container } from './sidebar-styles';
import { SelectableState } from '../../services/uml-element/selectable/selectable-types';

type OwnProps = {};

type StateProps = {
  readonly: boolean;
  mode: ApollonMode;
  view: ApollonView;
  selected: SelectableState;
};

type DispatchProps = {
  changeView: typeof EditorRepository.changeView;
};

type Props = OwnProps & StateProps & DispatchProps & I18nContext;

const enhance = compose<ComponentClass<OwnProps>>(
  localized,
  connect<StateProps, DispatchProps, OwnProps, ModelState>(
    (state) => ({
      readonly: state.editor.readonly,
      mode: state.editor.mode,
      view: state.editor.view,
      selected: state.selected,
    }),
    {
      changeView: EditorRepository.changeView,
    },
  ),
);

class SidebarComponent extends Component<Props> {
  render() {
    if (this.props.readonly || this.props.mode === ApollonMode.Assessment) return null;

    return (
      <Container id="modeling-editor-sidebar" data-cy="modeling-editor-sidebar">
        {this.props.mode === ApollonMode.Exporting && (
          <div className="dropdown" style={{ width: 128 }}>
            <select
              value={this.props.view}
              onChange={(event) => this.props.changeView(event.target.value as ApollonView)}
              color="primary"
            >
              <option value={ApollonView.Modelling}>{this.props.translate('views.modelling')}</option>
              <option value={ApollonView.Exporting}>{this.props.translate('views.exporting')}</option>
            </select>
          </div>
        )}
        {this.props.view === ApollonView.Modelling ? (
          <CreatePane />
        ) : (
          <label htmlFor="toggleInteractiveElementsMode">
            <input
              id="toggleInteractiveElementsMode"
              type="checkbox"
              checked={this.props.view === ApollonView.Exporting}
              onChange={this.toggleInteractiveElementsMode}
            />
            {this.props.translate('views.highlight')}
          </label>
        )}
      </Container>
    );
  }

  toggleInteractiveElementsMode = (event: React.FormEvent<HTMLInputElement>) => {
    const { checked } = event.currentTarget;
    const view: ApollonView = checked ? ApollonView.Exporting : ApollonView.Highlight;

    this.props.changeView(view);
  };
}

export const Sidebar = enhance(SidebarComponent);
