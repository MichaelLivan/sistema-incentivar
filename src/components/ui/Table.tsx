import React from 'react';

interface TableProps {
  children: React.ReactNode;
  className?: string;
}

export const Table: React.FC<TableProps> = ({ children, className = '' }) => {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full border-collapse bg-white rounded-lg overflow-hidden shadow-lg ${className}`}>
        {children}
      </table>
    </div>
  );
};

interface TableHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const TableHeader: React.FC<TableHeaderProps> = ({ children, className = '' }) => {
  return (
    <thead className={`bg-purple-700 text-white ${className}`}>
      {children}
    </thead>
  );
};

interface TableBodyProps {
  children: React.ReactNode;
  className?: string;
}

export const TableBody: React.FC<TableBodyProps> = ({ children, className = '' }) => {
  return (
    <tbody className={className}>
      {children}
    </tbody>
  );
};

interface TableRowProps {
  children: React.ReactNode;
  className?: string;
}

export const TableRow: React.FC<TableRowProps> = ({ children, className = '' }) => {
  return (
    <tr className={`hover:bg-purple-50 transition-colors duration-200 ${className}`}>
      {children}
    </tr>
  );
};

interface TableCellProps {
  children: React.ReactNode;
  className?: string;
}

export const TableCell: React.FC<TableCellProps> = ({ children, className = '' }) => {
  return (
    <td className={`px-4 py-3 text-sm border-b border-gray-200 ${className}`}>
      {children}
    </td>
  );
};

interface TableHeadCellProps {
  children: React.ReactNode;
  className?: string;
}

export const TableHeadCell: React.FC<TableHeadCellProps> = ({ children, className = '' }) => {
  return (
    <th className={`px-4 py-3 text-left text-sm font-bold uppercase tracking-wide ${className}`}>
      {children}
    </th>
  );
};