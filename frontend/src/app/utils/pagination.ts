export type PaginationItem = number | 'ellipsis';

export function getPaginationItems(currentPage: number, totalPages: number): PaginationItem[] {
  if (totalPages <= 6) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set([1, 2, totalPages - 1, totalPages]);
  for (let page = currentPage - 1; page <= currentPage + 1; page += 1) {
    if (page > 2 && page < totalPages - 1) {
      pages.add(page);
    }
  }

  const sortedPages = Array.from(pages).sort((first, second) => first - second);
  const items: PaginationItem[] = [];
  sortedPages.forEach((page, index) => {
    if (index > 0) {
      const gap = page - sortedPages[index - 1];
      if (gap === 2) {
        items.push(page - 1);
      } else if (gap > 2) {
        items.push('ellipsis');
      }
    }
    items.push(page);
  });

  return items;
}
