import { hashHistory } from 'dva/router';
import { parse } from 'qs';
import pathToRegexp from 'path-to-regexp';
import { query, create, remove, update, grant, rolePermissions } from '../services/roles';
import { getLocalStorage, setLocalStorage } from '../utils/helper';

export default {
  namespace: 'roles',
  state: {
    list: [],
    keyword: '',
    total: null,
    loading: false,
    current: 1,
    currentItem: {},
    modalVisible: false,
    modalType: 'create',
    modalGrantVisible: false,
  },
  reducers: {
    showLoading(state, action) {
      return { ...state, loading: true };
    },
    showModal(state, action) {
      return { ...state, ...action.payload, modalVisible: true };
    },
    hideModal(state, action) {
      return { ...state, modalVisible: false };
    },
    showModalGrant(state, action) {
      return { ...state, ...action.payload, modalGrantVisible: true };
    },
    hideModalGrant(state, action) {
      return { ...state, modalGrantVisible: false };
    },
    querySuccess(state, action) {
      return { ...state, ...action.payload, loading: false };
    },
    createSuccess(state, action) {
      return { ...state, ...action.payload, loading: false };
    },
    deleteSuccess(state, action) {
      const id = action.payload;
      const newList = state.list.filter(role => role.id !== id);
      return { ...state, list: newList, loading: false };
    },
    updateSuccess(state, action) {
      const updateRole = action.payload;
      const newList = state.list.map((role) => {
        if (role.id === updateRole.id) {
          return { ...role, ...updateRole };
        }
        return role;
      });
      return { ...state, list: newList, loading: false };
    },
    updateQueryKey(state, action) {
      return { ...state, ...action.payload };
    },
    grantSuccess(state, action) {
      const grantRole = action.payload;
      const newList = state.list.map((role) => {
        if (role.id === grantRole.id) {
          role.permissions = grantRole.permissions;
          return { ...role };
        }
        return role;
      })
      return { ...state, ...action.payload, loading: false };
    },
  },
  effects: {
    *query({ payload }, { call, put }) {
      yield put({ type: 'showLoading' });
      yield put({
        type: 'updateQueryKey',
        payload: { page: 1, keyword: '', ...payload },
      });
      const { data } = yield call(query, parse({ ...payload, with: 'permissions'}));
      if (data && data.err_msg === 'SUCCESS') {
        yield put({
          type: 'querySuccess',
          payload: {
            list: data.data.list,
            total: data.data.total,
            current: data.data.current,
          },
        });
      }
    },
    *create({ payload }, { call, put }) {
      yield put({ type: 'hideModal' });
      yield put({ type: 'showLoading' });
      const { data } = yield call(create, payload);
      if (data && data.err_msg === 'SUCCESS') {
        yield put({
          type: 'query',
        });
      }
    },
    *'delete'({ payload }, { call, put }) {
      yield put({ type: 'showLoading' });
      const { data } = yield call(remove, { id: payload });
      if (data && data.err_msg === 'SUCCESS') {
        yield put({
          type: 'deleteSuccess',
          payload,
        });
      }
    },
    *update({ payload }, { select, call, put }) {
      yield put({ type: 'hideModal' });
      yield put({ type: 'showLoading' });
      const id = yield select(({ roles }) => roles.currentItem.id);
      const newRole = { ...payload, id };
      const { data } = yield call(update, newRole);
      if (data && data.err_msg === 'SUCCESS') {
        yield put({
          type: 'updateSuccess',
          payload: newRole,
        });
      }
    },
    *grant({ payload }, { select, call, put }) {
      yield put({ type: 'hideModalGrant' });
      yield put({ type: 'showLoading' });
      const id = yield select(({ roles }) => roles.currentItem.id);
      const newRole = { ...payload, id }
      const { data } = yield call(grant, newRole);
      if (data && data.err_msg === 'SUCCESS') {
        yield put({
          type: 'grantSuccess',
          payload: {
            id,
            permissions: data.data,
          },
        })
      }
    },
  },
  subscriptions: {
    setup({ dispatch, history }) {
      history.listen((location) => {
        const match = pathToRegexp('/roles').exec(location.pathname);
        if (match) {
          const data = getLocalStorage('permissions');
          if (!data) {
            dispatch({
              type: 'permissions/updateCache',
            });
          }
          dispatch({
            type: 'query',
            payload: location.query,
          });
        }
      });
    },
  },
}