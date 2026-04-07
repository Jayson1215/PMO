import { Suspense } from "react";
import { getEquipment, getCategories } from "@/actions/equipment";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { TableSkeleton } from "@/components/shared/loading-skeletons";
import { EquipmentFormDialog } from "@/components/admin/equipment-form";
import { Package, Archive } from "lucide-react";


async function EquipmentContent() {
  const [equipment, categories] = await Promise.all([
    getEquipment(),
    getCategories(),
  ]);

  if (!equipment || equipment.length === 0) {
    return (
      <div>
        <div className="mb-4 flex justify-end">
          <EquipmentFormDialog categories={categories || []} />
        </div>
        <EmptyState
          icon={<Package className="h-8 w-8 text-gray-400" />}
          title="No equipment yet"
          description="Start by adding equipment items to the inventory."
          action={<EquipmentFormDialog categories={categories || []} />}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {equipment.length} item{equipment.length !== 1 ? "s" : ""} in inventory
        </p>
        <EquipmentFormDialog categories={categories || []} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {equipment.map((item: any) => (
          <Card key={item.id} className="overflow-hidden">
            {/* Equipment Image */}
            <div className="relative h-40 bg-gray-100">
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Package className="h-12 w-12 text-gray-300" />
                </div>
              )}
              <div className="absolute right-2 top-2">
                <StatusBadge status={item.status} />
              </div>
            </div>

            <CardContent className="p-4">
              <div className="mb-2 flex items-start justify-between">
                <div>
                  <h3 className="font-semibold">{item.name}</h3>
                  {item.equipment_categories && (
                    <p className="text-xs text-muted-foreground">
                      {item.equipment_categories.name}
                    </p>
                  )}
                </div>
              </div>

              {item.description && (
                <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
                  {item.description}
                </p>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant={item.available_quantity > 0 ? "success" : "destructive"}>
                    {item.available_quantity}/{item.total_quantity} available
                  </Badge>
                </div>
                <EquipmentFormDialog
                  categories={categories || []}
                  equipment={item}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function AdminEquipmentPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Equipment Management</h1>
        <p className="text-muted-foreground">
          Add, edit, and manage equipment inventory
        </p>
      </div>

      <Suspense fallback={<TableSkeleton rows={6} />}>
        <EquipmentContent />
      </Suspense>
    </div>
  );
}
