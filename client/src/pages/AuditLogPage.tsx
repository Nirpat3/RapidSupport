import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Download, FilterX, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";

interface AuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  performedBy: string | null;
  performedByType: string;
  performerName: string | null;
  fieldName: string | null;
  oldValue: string | null;
  newValue: string | null;
  reason: string | null;
  createdAt: string;
  metadata: any;
  entitySnapshot: any;
}

interface AuditLogResponse {
  logs: AuditLogEntry[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState<string>("all");
  const [action, setAction] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [performedBy, setPerformedBy] = useState("");

  const { data, isLoading } = useQuery<AuditLogResponse>({
    queryKey: [
      "/api/admin/audit-log", 
      { 
        page, 
        entityType: entityType !== "all" ? entityType : undefined,
        action: action !== "all" ? action : undefined,
        from: dateFrom?.toISOString(),
        to: dateTo?.toISOString(),
        performedBy: performedBy || undefined
      }
    ],
    queryFn: async ({ queryKey }) => {
      const [_url, params] = queryKey as [string, any];
      const searchParams = new URLSearchParams();
      if (params.page) searchParams.append("page", params.page.toString());
      if (params.entityType) searchParams.append("entityType", params.entityType);
      if (params.action) searchParams.append("action", params.action);
      if (params.from) searchParams.append("from", params.from);
      if (params.to) searchParams.append("to", params.to);
      if (params.performedBy) searchParams.append("performedBy", params.performedBy);
      
      return apiRequest(`/api/admin/audit-log?${searchParams.toString()}`, 'GET');
    }
  });

  const resetFilters = () => {
    setEntityType("all");
    setAction("all");
    setDateFrom(undefined);
    setDateTo(undefined);
    setPerformedBy("");
    setPage(1);
  };

  const handleExport = () => {
    if (!data?.logs) return;
    
    const headers = ["Timestamp", "Entity Type", "Entity ID", "Action", "Performed By", "Field", "Old Value", "New Value", "Reason"];
    const rows = data.logs.map(log => [
      format(new Date(log.createdAt), "yyyy-MM-dd HH:mm:ss"),
      log.entityType,
      log.entityId,
      log.action,
      log.performerName || log.performedByType,
      log.fieldName || "",
      log.oldValue || "",
      log.newValue || "",
      log.reason || ""
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `audit-log-${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const entityTypes = ["conversation", "user", "customer", "organization", "workspace", "department"];
  const actions = ["create", "update", "delete", "restore"];

  return (
    <div className="p-4 sm:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
          <p className="text-muted-foreground">Track all significant system actions and changes.</p>
        </div>
        <Button onClick={handleExport} variant="outline" className="sm:w-auto">
          <Download className="w-4 h-4 mr-2" />
          Export to CSV
        </Button>
      </div>

      <Card className="glass-subtle border-border/50 shadow-sm">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Performed By (User ID)..."
                  value={performedBy}
                  onChange={(e) => setPerformedBy(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Select value={entityType} onValueChange={setEntityType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Entity Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {entityTypes.map(type => (
                  <SelectItem key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={action} onValueChange={setAction}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {actions.map(a => (
                  <SelectItem key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[150px] justify-start text-left font-normal",
                      !dateFrom && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "PPP") : <span>From</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-[150px] justify-start text-left font-normal",
                      !dateTo && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "PPP") : <span>To</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <Button variant="ghost" onClick={resetFilters} size="icon" title="Reset Filters">
              <FilterX className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border/50">
                <TableHead className="w-[180px]">Timestamp</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Performed By</TableHead>
                <TableHead className="max-w-[300px]">Changes</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><div className="h-4 w-full bg-muted animate-pulse rounded" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : data?.logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No audit logs found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                data?.logs.map((log) => (
                  <TableRow key={log.id} className="group hover:bg-muted/30 transition-colors border-b border-border/50 last:border-0">
                    <TableCell className="text-xs font-mono text-muted-foreground">
                      {format(new Date(log.createdAt), "MMM d, yyyy HH:mm:ss")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        log.action === "create" ? "default" :
                        log.action === "delete" ? "destructive" :
                        "secondary"
                      } className="capitalize font-medium">
                        {log.action}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium capitalize">{log.entityType}</span>
                        <span className="text-xs text-muted-foreground font-mono truncate max-w-[120px]" title={log.entityId}>
                          {log.entityId}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{log.performerName || "System"}</span>
                        <span className="text-xs text-muted-foreground capitalize">{log.performedByType}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      {log.fieldName ? (
                        <div className="space-y-1">
                          <p className="text-xs font-semibold text-muted-foreground uppercase">{log.fieldName}</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-1.5 rounded bg-red-500/10 border border-red-500/20 truncate" title={log.oldValue || "empty"}>
                              <span className="text-red-500 font-mono">-{log.oldValue || '""'}</span>
                            </div>
                            <div className="p-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 truncate" title={log.newValue || "empty"}>
                              <span className="text-emerald-500 font-mono">+{log.newValue || '""'}</span>
                            </div>
                          </div>
                        </div>
                      ) : log.entitySnapshot ? (
                        <span className="text-xs text-muted-foreground italic">Full snapshot captured</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate" title={log.reason || ""}>
                      <span className="text-sm">{log.reason || "-"}</span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
        {data && data.pagination.pages > 1 && (
          <div className="p-4 border-t border-border/50 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Showing {(page - 1) * data.pagination.limit + 1} to {Math.min(page * data.pagination.limit, data.pagination.total)} of {data.pagination.total} entries
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-xs font-medium">
                Page {page} of {data.pagination.pages}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setPage(p => Math.min(data.pagination.pages, p + 1))}
                disabled={page === data.pagination.pages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
