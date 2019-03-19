import styled from 'styled-components';

export const DropdownItem = styled.option``;

export const Dropdown = styled.select`
  appearance: none;
  outline: none;
  font-size: 1em;
  width: 100%;
  position: relative;
  background: white;
  color: #212529;
  border: 1px solid #2a8fbd;
  padding: 0.375rem 0.75rem;
  margin: 0;
  line-height: 1.5;
  border-radius: 0.25rem;

  &::after {
    content: '▾';
    font-size: 1rem;
    position: absolute;
    right: 0.75rem;
    line-height: 1.5;
    top: 0.375rem;
    pointer-events: none;
  }
`;
