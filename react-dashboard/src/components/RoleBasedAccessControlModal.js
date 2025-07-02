import React, { useState } from 'react';
import { 
  Modal, 
  Button, 
  Form, 
  Row, 
  Col, 
  Card, 
  Table,
  Badge,
  Alert,
  OverlayTrigger,
  Tooltip as BSTooltip
} from 'react-bootstrap';
import { Tooltip } from 'react-tooltip';
  Alert
} from 'react-bootstrap';
import { 
  FaUserShield, 
  FaUserCog, 
  FaUser, 
  FaCheck, 
  FaTimes, 
  FaSave, 
  FaInfoCircle,
  FaQuestionCircle,
  FaLock,
  FaUnlock

  FaInfoCircle
} from 'react-icons/fa';

const RoleBasedAccessControlModal = ({ show, onHide, roles, permissions, onSave }) => {
  const [localRoles, setLocalRoles] = useState(roles);
  const [localPermissions, setLocalPermissions] = useState(permissions);
  const [activeTab, setActiveTab] = useState('roles'); // 'roles' or 'permissions'

  // Handle role toggle
  const handleRoleToggle = (role) => {
    setLocalRoles({
      ...localRoles,
      [role]: !localRoles[role]
    });
  };

  // Handle permission toggle
  const handlePermissionToggle = (permission) => {
    setLocalPermissions({
      ...localPermissions,
      [permission]: !localPermissions[permission]
    });
  };

  // Handle save
  const handleSave = () => {
    onSave(localRoles, localPermissions);
    onHide();
  };

  // Helper function for tooltips
  const renderTooltip = (content) => (props) => (
    <BSTooltip id="button-tooltip" {...props}>
      {content}
    </BSTooltip>
  );

  // Role descriptions with more detailed information
  const roleDescriptions = {
    admin: "Full administrative access to all system features including user management, security settings, and system configuration.",
    analyst: "Can view and analyze data, mark transactions as fraudulent, and generate reports, but cannot modify system settings or manage users.",
    viewer: "Read-only access to dashboard, transactions, and reports. Cannot modify any data or settings."
  };

  // Permission descriptions with more detailed information
  const permissionDescriptions = {
    viewTransactions: "Access to view transaction details, history, and metadata. Does not include ability to modify transaction data.",
    exportData: "Ability to export tables, charts, and reports in various formats (CSV, PDF, Excel).",
    markFraud: "Ability to flag transactions as fraudulent or legitimate, which affects the AI training model.",
    viewAnalytics: "Access to analytics dashboards, reports, and data visualization tools.",
    manageUsers: "Ability to add, edit, remove, and manage permissions for system users."
  };

  return (
    <Modal 
      show={show} 
      onHide={onHide}
      size="lg"
      centered
      dialogClassName="rbac-modal"
    >
      <Modal.Header closeButton className="rbac-modal-header">
      className="rbac-modal"
    >
      <Modal.Header closeButton className="bg-gradient-to-r from-primary to-dark text-white">
        <Modal.Title>
          <FaUserShield className="me-2" />
          Role-Based Access Control
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="rbac-modal-body">
        <Alert variant="info" className="rbac-info-alert">
          <div className="d-flex align-items-center">
            <FaInfoCircle className="me-3 rbac-info-icon" />
            <div>
              <h5 className="mb-1">Access Control Management</h5>
              <p className="mb-0">Configure user roles and permissions to control access to different features of the dashboard. Each role comes with a predefined set of permissions.</p>
            </div>
          </div>
        </Alert>

        <div className="rbac-tabs mb-4">
          <Button 
            variant={activeTab === 'roles' ? 'primary' : 'outline-primary'} 
            className={`rbac-tab-button ${activeTab === 'roles' ? 'active' : ''}`}
     
      <Modal.Body>
        <Alert variant="info" className="mb-4">
          <FaInfoCircle className="me-2" />
          Configure user roles and permissions to control access to different features of the dashboard.
        </Alert>

        <div className="d-flex mb-4">
          <Button 
            variant={activeTab === 'roles' ? 'primary' : 'outline-primary'} 
            className="me-2 flex-grow-1"
            onClick={() => setActiveTab('roles')}
          >
            <FaUserCog className="me-2" />
            User Roles
          </Button>
          <Button 
            variant={activeTab === 'permissions' ? 'primary' : 'outline-primary'} 
            className={`rbac-tab-button ${activeTab === 'permissions' ? 'active' : ''}`}
            className="flex-grow-1"
            onClick={() => setActiveTab('permissions')}
          >
            <FaUserShield className="me-2" />
            Permissions
          </Button>
        </div>

        {activeTab === 'roles' ? (
          <Card className="rbac-card">
            <Card.Header className="rbac-card-header">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">User Roles</h5>
                <OverlayTrigger
                  placement="top"
                  delay={{ show: 250, hide: 400 }}
                  overlay={renderTooltip("Roles define a set of permissions granted to users")}
                >
                  <FaQuestionCircle className="text-muted" />
                </OverlayTrigger>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="rbac-role-cards">
                <Row className="g-3">
                  <Col md={4}>
                    <Card className={`rbac-role-card rounded-xl border p-0 shadow bg-white hover:shadow-md transition ${localRoles.admin ? 'active' : ''}`}>
                      <Card.Body className="p-4">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <div className="d-flex align-items-center">
                            <h3 className="text-lg font-semibold text-gray-800 mb-0 me-2">Admin</h3>
                            {localRoles.admin ? 
                              <FaUnlock className="rbac-role-icon text-success" data-tooltip-id="admin-role-tooltip" data-tooltip-content="Role enabled" /> : 
                              <FaLock className="rbac-role-icon text-muted" data-tooltip-id="admin-role-tooltip" data-tooltip-content="Role disabled" />
                            }
                            <Tooltip id="admin-role-tooltip" place="top" />
                          </div>
                          <Form.Check 
                            type="switch"
                            id="admin-role-switch"
                            checked={localRoles.admin}
                            onChange={() => handleRoleToggle('admin')}
                            className="rbac-role-switch"
                          />
                        </div>
                        <p className="text-sm text-gray-600 mt-2 text-left">{roleDescriptions.admin}</p>
                        <div className="rbac-role-status mt-3">
                          {localRoles.admin ? (
                            <Badge bg="success" className="w-100 py-2">Enabled</Badge>
                          ) : (
                            <Badge bg="secondary" className="w-100 py-2">Disabled</Badge>
                          )}
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={4}>
                    <Card className={`rbac-role-card rounded-xl border p-0 shadow bg-white hover:shadow-md transition ${localRoles.analyst ? 'active' : ''}`}>
                      <Card.Body className="p-4">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <div className="d-flex align-items-center">
                            <h3 className="text-lg font-semibold text-gray-800 mb-0 me-2">Analyst</h3>
                            {localRoles.analyst ? 
                              <FaUnlock className="rbac-role-icon text-success" data-tooltip-id="analyst-role-tooltip" data-tooltip-content="Role enabled" /> : 
                              <FaLock className="rbac-role-icon text-muted" data-tooltip-id="analyst-role-tooltip" data-tooltip-content="Role disabled" />
                            }
                            <Tooltip id="analyst-role-tooltip" place="top" />
                          </div>
                          <Form.Check 
                            type="switch"
                            id="analyst-role-switch"
                            checked={localRoles.analyst}
                            onChange={() => handleRoleToggle('analyst')}
                            className="rbac-role-switch"
                          />
                        </div>
                        <p className="text-sm text-gray-600 mt-2 text-left">{roleDescriptions.analyst}</p>
                        <div className="rbac-role-status mt-3">
                          {localRoles.analyst ? (
                            <Badge bg="success" className="w-100 py-2">Enabled</Badge>
                          ) : (
                            <Badge bg="secondary" className="w-100 py-2">Disabled</Badge>
                          )}
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={4}>
                    <Card className={`rbac-role-card rounded-xl border p-0 shadow bg-white hover:shadow-md transition ${localRoles.viewer ? 'active' : ''}`}>
                      <Card.Body className="p-4">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <div className="d-flex align-items-center">
                            <h3 className="text-lg font-semibold text-gray-800 mb-0 me-2">Viewer</h3>
                            {localRoles.viewer ? 
                              <FaUnlock className="rbac-role-icon text-success" data-tooltip-id="viewer-role-tooltip" data-tooltip-content="Role enabled" /> : 
                              <FaLock className="rbac-role-icon text-muted" data-tooltip-id="viewer-role-tooltip" data-tooltip-content="Role disabled" />
                            }
                            <Tooltip id="viewer-role-tooltip" place="top" />
                          </div>
                          <Form.Check 
                            type="switch"
                            id="viewer-role-switch"
                            checked={localRoles.viewer}
                            onChange={() => handleRoleToggle('viewer')}
                            className="rbac-role-switch"
                          />
                        </div>
                        <p className="text-sm text-gray-600 mt-2 text-left">{roleDescriptions.viewer}</p>
                        <div className="rbac-role-status mt-3">
                          {localRoles.viewer ? (
                            <Badge bg="success" className="w-100 py-2">Enabled</Badge>
                          ) : (
                            <Badge bg="secondary" className="w-100 py-2">Disabled</Badge>
                          )}
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </div>
            </Card.Body>
          </Card>
        ) : (
          <Card className="rbac-card">
            <Card.Header className="rbac-card-header">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Feature Permissions</h5>
                <OverlayTrigger
                  placement="top"
                  delay={{ show: 250, hide: 400 }}
                  overlay={renderTooltip("Permissions control access to specific features")}
                >
                  <FaQuestionCircle className="text-muted" />
                </OverlayTrigger>
              </div>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="rbac-permissions-list">
                {Object.entries(localPermissions).map(([key, value]) => (
                  <div key={key} className={`rbac-permission-item ${value ? 'active' : ''}`}>
                    <div className="rbac-permission-content">
                      <div className="rbac-permission-header">
                        <h6 className="mb-0">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</h6>
                        <Form.Check 
                          type="switch"
                          id={`${key}-switch`}
                          checked={value}
                          onChange={() => handlePermissionToggle(key)}
                          className="rbac-permission-switch"
                        />
                      </div>
                      <p className="rbac-permission-description">{permissionDescriptions[key]}</p>
                      <div className="rbac-permission-status">
                        {value ? (
                          <Badge bg="success" className="rbac-status-badge">
                            <FaCheck className="me-1" /> Enabled
                          </Badge>
                        ) : (
                          <Badge bg="secondary" className="rbac-status-badge">
                            <FaTimes className="me-1" /> Disabled
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
          <Card>
            <Card.Header>User Roles</Card.Header>
            <Card.Body>
              <Table bordered hover>
                <thead>
                  <tr>
                    <th>Role</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <Badge bg="danger">Admin</Badge>
                    </td>
                    <td>Full access to all features including user management</td>
                    <td>
                      {localRoles.admin ? (
                        <Badge bg="success">Enabled</Badge>
                      ) : (
                        <Badge bg="secondary">Disabled</Badge>
                      )}
                    </td>
                    <td>
                      <Form.Check 
                        type="switch"
                        id="admin-role-switch"
                        checked={localRoles.admin}
                        onChange={() => handleRoleToggle('admin')}
                        label=""
                      />
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <Badge bg="warning" text="dark">Analyst</Badge>
                    </td>
                    <td>Can view and analyze data, mark fraud, but cannot manage users</td>
                    <td>
                      {localRoles.analyst ? (
                        <Badge bg="success">Enabled</Badge>
                      ) : (
                        <Badge bg="secondary">Disabled</Badge>
                      )}
                    </td>
                    <td>
                      <Form.Check 
                        type="switch"
                        id="analyst-role-switch"
                        checked={localRoles.analyst}
                        onChange={() => handleRoleToggle('analyst')}
                        label=""
                      />
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <Badge bg="info">Viewer</Badge>
                    </td>
                    <td>Read-only access to dashboard and transactions</td>
                    <td>
                      {localRoles.viewer ? (
                        <Badge bg="success">Enabled</Badge>
                      ) : (
                        <Badge bg="secondary">Disabled</Badge>
                      )}
                    </td>
                    <td>
                      <Form.Check 
                        type="switch"
                        id="viewer-role-switch"
                        checked={localRoles.viewer}
                        onChange={() => handleRoleToggle('viewer')}
                        label=""
                      />
                    </td>
                  </tr>
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        ) : (
          <Card>
            <Card.Header>Feature Permissions</Card.Header>
            <Card.Body>
              <Table bordered hover>
                <thead>
                  <tr>
                    <th>Permission</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>View Transactions</td>
                    <td>Access to view transaction details</td>
                    <td>
                      {localPermissions.viewTransactions ? (
                        <Badge bg="success">Enabled</Badge>
                      ) : (
                        <Badge bg="secondary">Disabled</Badge>
                      )}
                    </td>
                    <td>
                      <Form.Check 
                        type="switch"
                        id="view-transactions-switch"
                        checked={localPermissions.viewTransactions}
                        onChange={() => handlePermissionToggle('viewTransactions')}
                        label=""
                      />
                    </td>
                  </tr>
                  <tr>
                    <td>Export Data</td>
                    <td>Ability to export tables and charts</td>
                    <td>
                      {localPermissions.exportData ? (
                        <Badge bg="success">Enabled</Badge>
                      ) : (
                        <Badge bg="secondary">Disabled</Badge>
                      )}
                    </td>
                    <td>
                      <Form.Check 
                        type="switch"
                        id="export-data-switch"
                        checked={localPermissions.exportData}
                        onChange={() => handlePermissionToggle('exportData')}
                        label=""
                      />
                    </td>
                  </tr>
                  <tr>
                    <td>Mark Fraud</td>
                    <td>Ability to mark transactions as fraud or legitimate</td>
                    <td>
                      {localPermissions.markFraud ? (
                        <Badge bg="success">Enabled</Badge>
                      ) : (
                        <Badge bg="secondary">Disabled</Badge>
                      )}
                    </td>
                    <td>
                      <Form.Check 
                        type="switch"
                        id="mark-fraud-switch"
                        checked={localPermissions.markFraud}
                        onChange={() => handlePermissionToggle('markFraud')}
                        label=""
                      />
                    </td>
                  </tr>
                  <tr>
                    <td>View Analytics</td>
                    <td>Access to analytics and reporting features</td>
                    <td>
                      {localPermissions.viewAnalytics ? (
                        <Badge bg="success">Enabled</Badge>
                      ) : (
                        <Badge bg="secondary">Disabled</Badge>
                      )}
                    </td>
                    <td>
                      <Form.Check 
                        type="switch"
                        id="view-analytics-switch"
                        checked={localPermissions.viewAnalytics}
                        onChange={() => handlePermissionToggle('viewAnalytics')}
                        label=""
                      />
                    </td>
                  </tr>
                  <tr>
                    <td>Manage Users</td>
                    <td>Ability to add, edit, and remove users</td>
                    <td>
                      {localPermissions.manageUsers ? (
                        <Badge bg="success">Enabled</Badge>
                      ) : (
                        <Badge bg="secondary">Disabled</Badge>
                      )}
                    </td>
                    <td>
                      <Form.Check 
                        type="switch"
                        id="manage-users-switch"
                        checked={localPermissions.manageUsers}
                        onChange={() => handlePermissionToggle('manageUsers')}
                        label=""
                      />
                    </td>
                  </tr>
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        )}
      </Modal.Body>

      <Modal.Footer className="rbac-modal-footer">
        <div className="d-flex justify-content-between w-100">
          <Button variant="outline-secondary" onClick={onHide} className="rbac-cancel-btn">
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} className="rbac-save-btn">
            <FaSave className="me-2" />
            Save Changes
          </Button>
        </div>
      
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSave}>
          <FaSave className="me-2" />
          Save Changes
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default RoleBasedAccessControlModal;
export default RoleBasedAccessControlModal;
