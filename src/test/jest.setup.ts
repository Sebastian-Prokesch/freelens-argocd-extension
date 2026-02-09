import "@testing-library/jest-dom";

if (!global.MobxReact) {
  global.MobxReact = {
    observer: (component: any) => component,
  } as any;
}
