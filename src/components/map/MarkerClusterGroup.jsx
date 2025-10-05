import { createPathComponent } from '@react-leaflet/core';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

const MarkerClusterGroup = createPathComponent(
  ({ children: _c, ...props }, ctx) => {
    const clusterProps = {};
    const clusterEvents = {};

    // Separate props and events
    Object.entries(props).forEach(([propName, prop]) => {
      if (propName.startsWith('on')) {
        clusterEvents[propName] = prop;
      } else {
        clusterProps[propName] = prop;
      }
    });

    const markerClusterGroup = L.markerClusterGroup(clusterProps);

    // Attach events
    Object.entries(clusterEvents).forEach(([eventAsProp, callback]) => {
      const eventName = eventAsProp.substring(2).toLowerCase();
      markerClusterGroup.on(eventName, callback);
    });

    return {
      instance: markerClusterGroup,
      context: { ...ctx, layerContainer: markerClusterGroup },
    };
  }
);

export default MarkerClusterGroup;
