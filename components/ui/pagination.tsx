import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  siblingCount?: number;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
}: PaginationProps) {
  // Generate page numbers to display
  const generatePagination = () => {
    // Always show first and last page
    const firstPage = 1;
    const lastPage = totalPages;
    
    // Calculate range of pages to show around current page
    const leftSiblingIndex = Math.max(currentPage - siblingCount, firstPage);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, lastPage);
    
    // Determine if we need to show ellipses
    const shouldShowLeftDots = leftSiblingIndex > firstPage + 1;
    const shouldShowRightDots = rightSiblingIndex < lastPage - 1;
    
    // Generate the array of page numbers to display
    const pageNumbers: (number | string)[] = [];
    
    // Always add first page
    pageNumbers.push(firstPage);
    
    // Add left ellipsis if needed
    if (shouldShowLeftDots) {
      pageNumbers.push('left-dots');
    }
    
    // Add pages around current page
    for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) {
      if (i !== firstPage && i !== lastPage) {
        pageNumbers.push(i);
      }
    }
    
    // Add right ellipsis if needed
    if (shouldShowRightDots) {
      pageNumbers.push('right-dots');
    }
    
    // Always add last page if it's not the same as first page
    if (lastPage !== firstPage) {
      pageNumbers.push(lastPage);
    }
    
    return pageNumbers;
  };
  
  const pageNumbers = generatePagination();
  
  return (
    <div className="flex items-center justify-center space-x-2">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">Previous page</span>
      </Button>
      
      {pageNumbers.map((page, index) => {
        if (typeof page === 'string') {
          return (
            <Button
              key={page}
              variant="ghost"
              size="icon"
              disabled
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">More pages</span>
            </Button>
          );
        }
        
        return (
          <Button
            key={index}
            variant={currentPage === page ? "default" : "outline"}
            onClick={() => onPageChange(page)}
          >
            {page}
          </Button>
        );
      })}
      
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
      >
        <ChevronRight className="h-4 w-4" />
        <span className="sr-only">Next page</span>
      </Button>
    </div>
  );
} 