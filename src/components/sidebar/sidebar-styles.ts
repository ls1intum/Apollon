import styled from 'styled-components';

export const Container = styled.aside`
  flex: 0 0 230px;
  padding: 0 10px;
  height: 100%;
  min-height: inherit;
  max-height: inherit;
  overflow: scroll;
  display: flex;
  flex-direction: column;
`;

export const Preview = styled.div`
  margin: 0.5em 0;
`;

export const EditorModeSelection = styled.div`
  display: flex;
  border-radius: 3px;
  overflow: hidden;
`;

export const EditorModeSelectionSegment: any = styled.button`
  display: block;
  text-align: center;
  padding: 5px 10px;
  flex-grow: 1;
  text-decoration: none;
  border: 1px solid ${(props: any) => props.theme.primaryColor};
  border-left-width: 0;
  background: ${(props: any) => (props.selected ? props.theme.primaryColor : 'white')};
  color: ${(props: any) => (props.selected ? 'white' : props.theme.primaryColor)} !important;
  text-decoration: none !important;
  font-size: 1rem;
  cursor: pointer;
  outline: none;
  font-weight: normal !important;

  :first-child {
    border-left-width: 1px;
    border-top-left-radius: 3px;
    border-bottom-left-radius: 3px;
  }

  :last-child {
    border-top-right-radius: 3px;
    border-bottom-right-radius: 3px;
  }
`;
