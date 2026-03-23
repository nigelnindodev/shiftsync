export default async () => {
    const container = (global as any).__PG_CONTAINER__;
    if (container) {
        await container.stop();
    }
};
