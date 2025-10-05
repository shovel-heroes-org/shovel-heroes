import useSWR from 'swr';
import { Grid, SupplyDonation, User } from "@/api/entities";

export function useSuppliesData(refreshInterval = 60000) {
  const { data, error, isLoading, mutate } = useSWR('supplies-data', async () => {
    const [donationsData, gridsData, currentUserData] = await Promise.all([
      SupplyDonation.list(),
      Grid.list(),
      User.me()
    ]);

    const pledged = donationsData.filter(d => d.status === 'pledged').length;
    const confirmed = donationsData.filter(d => d.status === 'confirmed').length;
    const delivered = donationsData.filter(d => d.status === 'delivered').length;

    // 計算未滿足的物資需求
    const unfulfilled = [];
    gridsData.forEach(grid => {
      if (grid.supplies_needed && grid.supplies_needed.length > 0) {
        grid.supplies_needed.forEach(supply => {
          const remaining = supply.quantity - (supply.received || 0);
          if (remaining > 0) {
            unfulfilled.push({
              gridId: grid.id,
              gridCode: grid.code,
              gridType: grid.grid_type,
              supplyName: supply.name,
              totalNeeded: supply.quantity,
              received: supply.received || 0,
              remaining: remaining,
              unit: supply.unit
            });
          }
        });
      }
    });

    return {
      donations: donationsData,
      grids: gridsData,
      currentUser: currentUserData,
      stats: {
        total: donationsData.length,
        pledged,
        confirmed,
        delivered
      },
      unfulfilledRequests: unfulfilled
    };
  }, {
    refreshInterval: refreshInterval, // default 60 seconds
  });

  return {
    donations: data?.donations || [],
    grids: data?.grids || [],
    currentUser: data?.currentUser || null,
    stats: data?.stats || {
      total: 0,
      pledged: 0,
      confirmed: 0,
      delivered: 0
    },
    unfulfilledRequests: data?.unfulfilledRequests || [],
    isLoading,
    error,
    mutate
  };
}