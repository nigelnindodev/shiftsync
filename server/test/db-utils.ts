import { DataSource } from 'typeorm';

export async function clearDatabase(dataSource: DataSource) {
    const entities = dataSource.entityMetadatas;
    const tableNames = entities
        .map((entity) => `"${entity.tableName}"`)
        .join(', ');

    if (tableNames.length > 0) {
        await dataSource.query(`TRUNCATE TABLE ${tableNames} CASCADE;`);
    }
}
