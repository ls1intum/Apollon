import styled from 'styled-components';

export default styled.div`
  overflow: scroll;
  width: 100%;
  height: 100%;
  border: 1px solid ${({ theme }) => theme.borderColor};
`;
