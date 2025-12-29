/**
 * kintone JavaScript API 型定義
 * @see https://cybozu.dev/ja/kintone/docs/js-api/
 */

declare namespace kintone {
  // イベントタイプ
  type DesktopEventType =
    | 'app.record.index.show'
    | 'app.record.index.edit.show'
    | 'app.record.index.edit.submit'
    | 'app.record.index.edit.submit.success'
    | 'app.record.index.delete.submit'
    | 'app.record.detail.show'
    | 'app.record.detail.delete.submit'
    | 'app.record.detail.process.proceed'
    | 'app.record.create.show'
    | 'app.record.create.change.*'
    | 'app.record.create.submit'
    | 'app.record.create.submit.success'
    | 'app.record.edit.show'
    | 'app.record.edit.change.*'
    | 'app.record.edit.submit'
    | 'app.record.edit.submit.success'
    | 'app.record.print.show'
    | 'app.report.show';

  type MobileEventType =
    | 'mobile.app.record.index.show'
    | 'mobile.app.record.detail.show'
    | 'mobile.app.record.detail.delete.submit'
    | 'mobile.app.record.detail.process.proceed'
    | 'mobile.app.record.create.show'
    | 'mobile.app.record.create.change.*'
    | 'mobile.app.record.create.submit'
    | 'mobile.app.record.create.submit.success'
    | 'mobile.app.record.edit.show'
    | 'mobile.app.record.edit.change.*'
    | 'mobile.app.record.edit.submit'
    | 'mobile.app.record.edit.submit.success';

  type EventType = DesktopEventType | MobileEventType | string | string[];

  // フィールド値の型
  interface FieldValue {
    type: string;
    value: any;
  }

  // レコードの型
  interface Record {
    $id?: FieldValue;
    $revision?: FieldValue;
    [fieldCode: string]: FieldValue | undefined;
  }

  // イベントオブジェクトの型
  interface Event {
    appId: number;
    recordId?: number;
    record?: Record;
    records?: Record[];
    error?: string;
    url?: string;
    type: string;
    changes?: {
      field: FieldValue;
      row?: any;
    };
    reuse?: boolean;
  }

  // イベントハンドラの型
  type EventHandler = (event: Event) => Event | Promise<Event> | void;

  // kintone.events
  namespace events {
    function on(type: EventType, handler: EventHandler): void;
    function off(type: EventType, handler?: EventHandler): void;
  }

  // kintone.app
  namespace app {
    function getId(): number | null;
    function getQueryCondition(): string | null;
    function getQuery(): string | null;
    function getFieldElements(fieldCode: string): HTMLElement[] | null;
    function getHeaderMenuSpaceElement(): HTMLElement | null;
    function getHeaderSpaceElement(): HTMLElement | null;

    namespace record {
      function getId(): number | null;
      function get(): { record: Record } | null;
      function set(obj: { record: Record }): void;
      function getFieldElement(fieldCode: string): HTMLElement | null;
      function getSpaceElement(id: string): HTMLElement | null;
      function getHeaderMenuSpaceElement(): HTMLElement | null;
      function setFieldShown(fieldCode: string, isShown: boolean): void;
      function setGroupFieldOpen(fieldCode: string, isOpen: boolean): void;
    }
  }

  // kintone.mobile
  namespace mobile {
    namespace app {
      function getId(): number | null;
      function getHeaderSpaceElement(): HTMLElement | null;

      namespace record {
        function getId(): number | null;
        function get(): { record: Record } | null;
        function set(obj: { record: Record }): void;
        function getSpaceElement(id: string): HTMLElement | null;
        function setFieldShown(fieldCode: string, isShown: boolean): void;
        function setGroupFieldOpen(fieldCode: string, isOpen: boolean): void;
      }
    }
  }

  // kintone.api
  function api(
    pathOrUrl: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    params: object
  ): Promise<any>;

  function api(
    pathOrUrl: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    params: object,
    successCallback: (response: any) => void,
    failureCallback?: (error: any) => void
  ): void;

  // kintone.api.url
  namespace api {
    function url(path: string, detectGuestSpace?: boolean): string;
    function urlForGet(path: string, params: object, detectGuestSpace?: boolean): string;
  }

  // kintone.proxy
  function proxy(
    url: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    headers: object,
    data: object | string
  ): Promise<[string, number, object]>;

  function proxy(
    url: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    headers: object,
    data: object | string,
    successCallback: (body: string, status: number, headers: object) => void,
    failureCallback?: (error: string) => void
  ): void;

  // kintone.getLoginUser
  function getLoginUser(): {
    id: string;
    code: string;
    name: string;
    email: string;
    url: string;
    employeeNumber: string;
    phone: string;
    mobilePhone: string;
    extensionNumber: string;
    timezone: string;
    isGuest: boolean;
    language: string;
  };

  // kintone.getRequestToken
  function getRequestToken(): string;

  // kintone.getUiVersion
  function getUiVersion(): 1 | 2;

  // kintone.Promise
  const Promise: PromiseConstructor;
}

// グローバルにkintoneを宣言
declare const kintone: typeof kintone;
