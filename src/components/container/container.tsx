import styled from 'styled-components';

export const Editor = styled.div`
  display: block;
  width: 100%;
  min-height: inherit;
  max-height: inherit;
  max-width: inherit;

  overflow: scroll;
  border: 1px solid ${({ theme }) => theme.borderColor};
`;
