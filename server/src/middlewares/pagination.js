export const pagination = ({page, limit, orderType, orderBy}) => {
    const queries = {};
    const offset = (!page || +page <= 1) ? 0 : (+page - 1);
    const fLimit = (!limit || limit < 1) ? +process.env.LIMIT_PROJECT : limit;
    queries.offset = offset * fLimit;
    queries.limit = +fLimit;

    const fOrderType = (orderType === 'DESC') ? 'DESC' : 'ASC';
    const fOrderBy = (orderBy) ? orderBy : 'id';
    queries.order = [[fOrderBy, fOrderType]];
    return queries
}