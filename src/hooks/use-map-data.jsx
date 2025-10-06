import useSWR from 'swr';
import { DisasterArea, Grid } from "@/api/entities";

export function useMapData(refreshInterval = 60000) {
  const { data, error, isLoading, mutate } = useSWR('map-data', async () => {
    const [areasData, gridsData] = await Promise.all([
      DisasterArea.list(),
      Grid.list()
    ]);

    const completedGrids = gridsData.filter(g => g.status === 'completed').length;
    const totalVolunteers = gridsData.reduce((sum, g) => sum + (g.volunteer_registered || 0), 0);
    const urgentGrids = gridsData.filter(g => {
      if (g.grid_type !== 'manpower' || !g.volunteer_needed || g.volunteer_needed === 0) return false;
      const shortage = (g.volunteer_needed - (g.volunteer_registered || 0)) / g.volunteer_needed;
      return shortage >= 0.6 && g.status === 'open';
    });

    return {
      disasterAreas: areasData,
      grids: gridsData,
      stats: {
        totalGrids: gridsData.length,
        completedGrids,
        totalVolunteers,
        urgentGrids: urgentGrids.length,
      },
      urgentGridsList: urgentGrids,
    };
  }, {
    refreshInterval: refreshInterval, // default 60 seconds
  });

  return {
    disasterAreas: data?.disasterAreas || [],
    grids: data?.grids || [],
    stats: data?.stats || {
      totalGrids: 0,
      completedGrids: 0,
      totalVolunteers: 0,
      urgentGrids: 0
    },
    urgentGridsList: data?.urgentGridsList || [],
    isLoading,
    error,
    mutate
  };
}