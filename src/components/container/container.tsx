import { styled } from '../theme/styles';

export const Editor = styled.div`
  display: block;
  width: 100%;
  min-height: inherit;
  max-height: inherit;
  max-width: inherit;

  overflow: auto;
  -ms-overflow-style: -ms-autohiding-scrollbar;
  border: 1px solid ${props => props.theme.color.gray500};
`;
