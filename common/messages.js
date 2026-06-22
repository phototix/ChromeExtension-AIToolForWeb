const MSG = {
  // DevTools panel -> Background
  EXECUTE_TASK: 'execute-task',
  CANCEL_TASK: 'cancel-task',
  PAUSE_TASK: 'pause-task',
  RESUME_TASK: 'resume-task',
  GET_STATUS: 'get-status',
  GET_TASK_QUEUE: 'get-task-queue',
  APPROVE_STEP: 'approve-step',
  REJECT_STEP: 'reject-step',
  MODIFY_STEP: 'modify-step',

  // Background -> Content Script
  GET_STRUCTURE: 'get-structure',
  FIND_ELEMENT: 'find-element',
  CLICK: 'click',
  TYPE: 'type',
  SCROLL: 'scroll',
  READ: 'read',
  MODIFY: 'modify',
  HIGHLIGHT: 'highlight',
  RUN_JS: 'run-js',
  WAIT: 'wait',

  // Content Script -> Background
  ACTION_RESULT: 'action-result',
  ELEMENT_FOUND: 'element-found',

  // Background -> DevTools Panel
  TASK_PROGRESS: 'task-progress',
  TASK_COMPLETE: 'task-complete',
  TASK_ERROR: 'task-error',
  PLAN_READY: 'plan-ready',
  STEP_APPROVAL: 'step-approval',
  STATUS_UPDATE: 'status-update',
  QUEUE_UPDATE: 'queue-update'
};
