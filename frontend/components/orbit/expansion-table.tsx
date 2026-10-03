"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  TrendingUp,
  DollarSign,
  Target,
  Calendar,
  ArrowUpRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { formatCurrency, type Opportunity, type OpportunityStatus } from "@/lib/mock-data";
import { useOrbit } from "./orbit-provider";
import { useToastActions } from "./toast-provider";
import { OpportunityModal } from "./modals/opportunity-modal";
import { ConfirmModal } from "./modals/confirm-modal";

interface ExpansionTableProps {
  opportunities: Opportunity[];
  accountId: string;
}

const statusConfig: Record<
  OpportunityStatus,
  { label: string; className: string }
> = {
  identified: { label: "Identified", className: "badge-neutral" },
  qualified: { label: "Qualified", className: "badge-info" },
  proposed: { label: "Proposed", className: "badge-warning" },
  negotiation: { label: "Negotiation", className: "badge-warning" },
  closed_won: { label: "Won", className: "badge-success" },
  closed_lost: { label: "Lost", className: "badge-critical" },
};

function getProbabilityBadge(probability: number) {
  if (probability >= 70) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-medium badge-success">
        <TrendingUp className="w-3 h-3" />
        {probability}%
      </span>
    );
  }
  if (probability >= 40) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-medium badge-warning">
        <Target className="w-3 h-3" />
        {probability}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-mono font-medium badge-neutral">
      <Target className="w-3 h-3" />
      {probability}%
    </span>
  );
}

export function ExpansionTable({
  opportunities,
  accountId,
}: ExpansionTableProps) {
  const { deleteOpportunity } = useOrbit();
  const toast = useToastActions();
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const totalPotential = opportunities.reduce(
    (sum, opp) => sum + opp.potentialArr,
    0
  );
  const weightedPotential = opportunities.reduce(
    (sum, opp) => sum + opp.potentialArr * (opp.probability / 100),
    0
  );

  const handleAdd = () => {
    setEditingOpportunity(null);
    setShowModal(true);
  };

  const handleEdit = (opp: Opportunity) => {
    setEditingOpportunity(opp);
    setShowModal(true);
  };

  const handleDelete = (id: string) => {
    deleteOpportunity(id);
    toast.success("Opportunity deleted");
    setDeleteConfirm(null);
  };

  const onAdd = handleAdd;
  const onEdit = handleEdit;
  const onDelete = handleDelete;

  return (
    <div className="card-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <DollarSign className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              Expansion Opportunities
            </h3>
            <p className="text-xs text-muted-foreground">
              {opportunities.length} opportunities | Pipeline:{" "}
              {formatCurrency(totalPotential)} | Weighted:{" "}
              {formatCurrency(weightedPotential)}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={handleAdd}
          className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          Add
        </Button>
      </div>

      {/* Content */}
      {opportunities.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <TrendingUp className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">
            No opportunities yet
          </p>
          <p className="text-xs text-muted-foreground mb-4 text-center">
            Track expansion and upsell opportunities for this account
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={handleAdd}
            className="gap-1.5 bg-transparent"
          >
            <Plus className="w-4 h-4" />
            Add First Opportunity
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">
                  Product
                </th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5">
                  Potential ARR
                </th>
                <th className="text-center text-xs font-medium text-muted-foreground px-4 py-2.5">
                  Probability
                </th>
                <th className="text-center text-xs font-medium text-muted-foreground px-4 py-2.5">
                  Status
                </th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {opportunities.map((opp, index) => {
                  const status = statusConfig[opp.status] || statusConfig.identified;
                  return (
                    <motion.tr
                      key={opp.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      onMouseEnter={() => setHoveredRow(opp.id)}
                      onMouseLeave={() => setHoveredRow(null)}
                      className={cn(
                        "border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors group",
                        index % 2 === 0 ? "bg-transparent" : "bg-muted/20"
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">
                            {opp.product}
                          </span>
                          <ArrowUpRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        {opp.notes && (
                          <span className="text-xs text-muted-foreground line-clamp-1">
                            {opp.notes}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-sm font-mono font-semibold text-foreground">
                          {formatCurrency(opp.potentialArr)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getProbabilityBadge(opp.probability)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                            status.className
                          )}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className={cn(
                                "h-8 w-8 p-0 transition-opacity",
                                hoveredRow === opp.id ? "opacity-100" : "opacity-0"
                              )}
                            >
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem onClick={() => handleEdit(opp)}>
                              <Pencil className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDeleteConfirm(opp.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      {/* Opportunity Modal */}
      <OpportunityModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingOpportunity(null);
        }}
        accountId={accountId}
        opportunity={editingOpportunity}
      />

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDelete(deleteConfirm)}
        title="Delete Opportunity?"
        message="This will permanently delete this expansion opportunity. This cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
