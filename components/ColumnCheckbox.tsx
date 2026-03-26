"use client";

import React from "react";

interface ColumnCheckboxProps {
  column: string;
  checked: boolean;
  onToggle: (column: string) => void;
}

function ColumnCheckbox({ column, checked, onToggle }: ColumnCheckboxProps) {
  const id = `col-${column}`;
  return (
    <div>
      <input
        type="checkbox"
        id={id}
        value={column}
        checked={checked}
        onChange={() => onToggle(column)}
      />
      <label htmlFor={id}>{column.replace(/_/g, " ")}</label>
    </div>
  );
}

export default React.memo(ColumnCheckbox);
