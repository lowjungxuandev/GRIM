export type DependencyCheck = {
  ok: boolean;
  latencyMs: number;
  error?: string;
};

export type HealthReport = {
  ok: boolean;
  firebase: DependencyCheck;
  openRouter: DependencyCheck;
  cloudinary: DependencyCheck;
};
