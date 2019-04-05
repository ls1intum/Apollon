import styled from 'styled-components';

export const Layout = styled.div`
  display: flex;
  width: 100%;
  height: 100%;
  min-width: inherit;
  min-height: inherit;
  max-width: inherit;
  max-height: inherit;
  box-sizing: border-box;
  user-select: none;
  position: relative;

  font-family: ${({ theme }) => theme.fontFamily};

  *,
  *:before,
  *:after {
    box-sizing: inherit;
  }
`;
