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
  Alert
} from 'react-bootstrap';
import { 
  FaUserShield, 
  FaUserCog, 
  FaUser, 
  FaCheck, 
  FaTimes, 
  FaSave, 
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

  return (
    <Modal 
      show={show} 
      onHide={onHide}
      size="lg"
      centered
      className="rbac-modal"
    >
      <Modal.Header closeButton className="bg-gradient-to-r from-primary to-dark text-white">
        <Modal.Title>
          <FaUserShield className="me-2" />
          Role-Based Access Control
        </Modal.Title>
      </Modal.Header>
      
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
            className="flex-grow-1"
            onClick={() => setActiveTab('permissions')}
          >
            <FaUserShield className="me-2" />
            Permissions
          </Button>
        </div>

        {activeTab === 'roles' ? (
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