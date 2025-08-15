
"use client"

import * as React from "react"
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Button, buttonVariants, type ButtonProps } from "@/components/ui/button"
import { useLanguage } from "@/hooks/use-language"
import { translations } from "@/types/language"
import { Input } from "./input";

const PaginationContainer = ({ className, ...props }: React.ComponentProps<"nav">) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn("mx-auto flex w-full justify-center", className)}
    {...props}
  />
)
PaginationContainer.displayName = "Pagination"

const PaginationContent = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("flex flex-row items-center gap-1", className)}
    {...props}
  />
))
PaginationContent.displayName = "PaginationContent"

const PaginationItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("", className)} {...props} />
))
PaginationItem.displayName = "PaginationItem"

type PaginationLinkProps = {
  isActive?: boolean
} & Pick<ButtonProps, "size"> &
  React.ComponentProps<"a">

const PaginationLink = ({
  className,
  isActive,
  size = "icon",
  ...props
}: PaginationLinkProps) => (
  <a
    aria-current={isActive ? "page" : undefined}
    className={cn(
      buttonVariants({
        variant: isActive ? "outline" : "ghost",
        size,
      }),
      className
    )}
    {...props}
  />
)
PaginationLink.displayName = "PaginationLink"

const PaginationPrevious = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => {
    const { language } = useLanguage();
    const t = translations[language];
    return (
        <PaginationLink
            aria-label="Go to previous page"
            size="default"
            className={cn("gap-1 pl-2.5 h-8 px-2.5", className)}
            {...props}
        >
            <ChevronLeft className="h-4 w-4" />
            <span>{t.productSelectionDialog.previous}</span>
        </PaginationLink>
    )
}
PaginationPrevious.displayName = "PaginationPrevious"

const PaginationNext = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => {
  const { language } = useLanguage();
  const t = translations[language];
  return (
    <PaginationLink
        aria-label="Go to next page"
        size="default"
        className={cn("gap-1 pr-2.5 h-8 px-2.5", className)}
        {...props}
    >
        <span>{t.productSelectionDialog.next}</span>
        <ChevronRight className="h-4 w-4" />
    </PaginationLink>
  )
}
PaginationNext.displayName = "PaginationNext"

const PaginationEllipsis = ({
  className,
  ...props
}: React.ComponentProps<"span">) => (
  <span
    aria-hidden
    className={cn("flex h-8 w-8 items-center justify-center", className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
)
PaginationEllipsis.displayName = "PaginationEllipsis"


type CustomPaginationProps = {
    totalPages: number;
    currentPage: number;
    onPageChange: (page: number) => void;
    className?: string;
}

const Pagination = ({ totalPages, currentPage, onPageChange, className }: CustomPaginationProps) => {
    const [inputValue, setInputValue] = React.useState(currentPage.toString());

    React.useEffect(() => {
        setInputValue(currentPage.toString());
    }, [currentPage]);
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
    };

    const handleInputBlur = () => {
        const pageNumber = parseInt(inputValue, 10);
        if (!isNaN(pageNumber) && pageNumber >= 1 && pageNumber <= totalPages) {
            onPageChange(pageNumber);
        } else {
           // Reset to current page if input is invalid
           setInputValue(currentPage.toString());
        }
    };
    
    const handleInputKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleInputBlur();
        }
    };

    const onNext = () => {
        if (currentPage < totalPages) {
            onPageChange(currentPage + 1);
        }
    };

    const onPrevious = () => {
        if (currentPage > 1) {
            onPageChange(currentPage - 1);
        }
    };

    if (totalPages <= 0) {
        return null;
    }

    return (
        <PaginationContainer className={className}>
            <PaginationContent>
                <PaginationItem>
                    <Button variant="ghost" size="icon" onClick={onPrevious} disabled={currentPage === 1} className="h-8 w-8">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                </PaginationItem>
                <PaginationItem>
                    <div className="flex items-center text-sm gap-1">
                    <Input 
                        type="text"
                        value={inputValue}
                        onChange={handleInputChange}
                        onBlur={handleInputBlur}
                        onKeyPress={handleInputKeyPress}
                        className="h-8 w-10 text-center"
                    />
                    <span>/</span>
                    <span>{totalPages}</span>
                    </div>
                </PaginationItem>
                 <PaginationItem>
                     <Button variant="ghost" size="icon" onClick={onNext} disabled={currentPage === totalPages} className="h-8 w-8">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </PaginationItem>
            </PaginationContent>
        </PaginationContainer>
    );
}

export { 
  PaginationContainer as Root,
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationPrevious, 
  PaginationNext, 
  PaginationEllipsis,
  Pagination
};
