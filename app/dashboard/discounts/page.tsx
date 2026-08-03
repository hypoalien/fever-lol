"use client";

import { Button } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsUpDownIcon,
  MoreHorizontal,
  PlusCircle,
  ArrowLeftRight,
} from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
const promocodes = [
  {
    id: "1",
    code: "SAVE10",
    description: "Save $10 on your order",
    timesUsed: 100,
    discount: "Flat $10 Off",
    status: "active",
  },
  {
    id: "2",
    code: "SUMMER20",
    description: "20% off summer sale",
    timesUsed: 50,
    discount: "20% Off",
    status: "draft",
  },
  {
    id: "3",
    code: "WELCOME15",
    description: "15% off for new customers",
    timesUsed: 150,
    discount: "15% Off",
    status: "active",
  },
  {
    id: "4",
    code: "FREESHIP",
    description: "Free shipping on orders over $50",
    timesUsed: 200,
    discount: "Free Shipping",
    status: "draft",
  },
  {
    id: "5",
    code: "HOLIDAY25",
    description: "25% off holiday sale",
    timesUsed: 75,
    discount: "25% Off",
    status: "active",
  },
];
type Promocode = (typeof promocodes)[number];

export default function DiscountsPage() {
  const [selectedTab, setSelectedTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPromocodes = promocodes.filter((promocode: Promocode) => {
    const matchesTab =
      selectedTab === "all" || promocode.status === selectedTab;

    const promocodeValuesString = Object.values(promocode)
      .map((value) => value?.toString().toLowerCase())
      .join(" ");

    const matchesSearch = promocodeValuesString.includes(
      searchQuery.toLowerCase()
    );

    return matchesTab && matchesSearch;
  });

  const handleTabClick = (tabValue: string) => {
    setSelectedTab(tabValue);
  };
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <h1 className="text-2xl font-bold tracking-tight">Discounts</h1>
      <Tabs value={selectedTab} onValueChange={handleTabClick}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
          <TabsList className="flex mb-4 md:mb-0 md:mr-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="draft">Draft</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
          </TabsList>
          <div className="flex flex-col md:flex-row items-start md:items-center w-full md:w-auto">
            <Input
              placeholder="Search Promocodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 mb-4 md:mb-0 md:mx-4 w-full md:w-[150px] lg:w-[250px]"
            />
          </div>
        </div>

        <TabsContent value="all">
          <PromocodeCardTable promocodes={filteredPromocodes} />
        </TabsContent>
        <TabsContent value="draft">
          <PromocodeCardTable promocodes={filteredPromocodes} />
        </TabsContent>
        <TabsContent value="active">
          <PromocodeCardTable promocodes={filteredPromocodes} />
        </TabsContent>
      </Tabs>
      {/* Add your events content here */}
    </div>
  );
}

const PromocodeCardTable = ({ promocodes }: { promocodes: Promocode[] }) => {
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const pageCount = Math.ceil(promocodes.length / pageSize);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < pageCount) {
      setPageIndex(newPage);
    }
  };

  return (
    <div x-chunk="dashboard-06-chunk-0">
      <CardHeader className="flex flex-row items-center">
        <div className="grid gap-2">
          <CardTitle>Promocodes</CardTitle>
          <CardDescription>
            Manage your Promocodes and view their usage.
          </CardDescription>
        </div>
        <Button size="sm" className="ml-auto gap-1">
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Add Promocode
          </span>
        </Button>
      </CardHeader>
      <CardContent>
        {promocodes.length === 0 ? (
          <div className="flex flex-1 pt-32 pb-32 items-center justify-center rounded-lg border border-dashed shadow-sm">
            <div className="flex flex-col items-center gap-1 text-center">
              <h3 className="text-2xl font-bold tracking-tight">
                You have no Promocodes
              </h3>
              <p className="text-sm text-muted-foreground">
                You can start using promocodes as soon as you add one.
              </p>
              <Button className="mt-4">Add Promocode</Button>
            </div>
          </div>
        ) : (
          <div className="max-h-screen overflow-y-auto">
            <div className="grid gap-4 mb-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
              {promocodes.map((promocode) => (
                <Card key={promocode.id} className="flex flex-col p-4">
                  <div className="flex flex-col flex-grow">
                    <CardHeader className="p-0 flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>{promocode.code}</CardTitle>
                        <CardDescription>
                          {promocode.description}
                        </CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            aria-haspopup="true"
                            size="icon"
                            variant="ghost"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Toggle menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                          <DropdownMenuItem>Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </CardHeader>
                    <CardContent className="p-0 mt-4">
                      <CardDescription className="text-sm text-muted-foreground">
                        Total Uses: {promocode.timesUsed}
                      </CardDescription>
                      <CardDescription className="text-sm text-muted-foreground">
                        Discount: {promocode.discount}
                      </CardDescription>
                    </CardContent>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm">Rows per page:</span>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => setPageSize(Number(value))}
          >
            <SelectTrigger className="h-8 w-16">
              <SelectValue placeholder={pageSize.toString()} />
            </SelectTrigger>
            <SelectContent side="top">
              <SelectItem value="5">5</SelectItem>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="20">20</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(0)}
            disabled={pageIndex === 0}
          >
            <ArrowLeftRight className="h-4 w-4" />
            <span className="sr-only">First page</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(pageIndex - 1)}
            disabled={pageIndex === 0}
          >
            <ChevronLeftIcon className="h-4 w-4" />
            <span className="sr-only">Previous page</span>
          </Button>
          <span className="text-sm">
            {pageIndex + 1} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => handlePageChange(pageIndex + 1)}
            disabled={pageIndex >= pageCount - 1}
          >
            <ChevronRightIcon className="h-4 w-4" />
            <span className="sr-only">Next page</span>
          </Button>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => handlePageChange(pageCount - 1)}
            disabled={pageIndex >= pageCount - 1}
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsUpDownIcon className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </div>
  );
};
