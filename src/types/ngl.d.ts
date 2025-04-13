import * as NGL from 'ngl';

declare module 'ngl' {
  interface Stage {
    animation: {
      spin(axis: any, angle: number): void;
    };
    viewer: {
      camera: {
        position: {
          z: number;
        };
      };
    };
  }

  interface Component {
    removeAllRepresentations(): void;
    addRepresentation(type: string, params?: {
      colorScheme?: string;
      surfaceType?: string;
      quality?: string;
      aspectRatio?: number;
      radiusScale?: number;
      bondScale?: number;
      opacity?: number;
      sidechain?: boolean;
    }): void;
    autoView(duration?: number): void;
  }
}