import pytest
import os
import shutil
from vexctx.vault.encryption import encryption_service, LocalKEKProvider, CloudKEKProvider
from vexctx.config import settings

@pytest.fixture(autouse=True)
def setup_temp_keys():
    # Temporary backup key path
    original_key_path = settings.VEXCTX_LOCAL_MASTER_KEY_PATH
    settings.VEXCTX_LOCAL_MASTER_KEY_PATH = "~/VEX CTX/test_master.key"
    
    # Remove any test key before test
    abs_path = settings.master_key_path_abs
    if os.path.exists(abs_path):
        os.remove(abs_path)
        
    yield
    
    # Cleanup after test
    if os.path.exists(abs_path):
        os.remove(abs_path)
    settings.VEXCTX_LOCAL_MASTER_KEY_PATH = original_key_path

def test_local_kek_provider():
    provider = LocalKEKProvider()
    key1 = provider.get_kek()
    assert len(key1) == 32
    assert os.path.exists(settings.master_key_path_abs)
    
    # Retrieve again, should read existing key
    key2 = provider.get_kek()
    assert key1 == key2

def test_envelope_encryption_roundtrip():
    # Set local provider
    encryption_service.set_provider(LocalKEKProvider())
    
    plaintext = b"Super secret AI-assisted project files!"
    encrypted_data = encryption_service.encrypt_envelope(plaintext)
    
    assert "encrypted_content" in encrypted_data
    assert "nonce" in encrypted_data
    assert "tag" in encrypted_data
    assert "encrypted_dek" in encrypted_data
    assert "dek_nonce" in encrypted_data
    assert "dek_tag" in encrypted_data
    
    decrypted = encryption_service.decrypt_envelope(encrypted_data)
    assert decrypted == plaintext

def test_cloud_kek_provider_roundtrip():
    # Use mock cloud provider
    encryption_service.set_provider(CloudKEKProvider())
    
    plaintext = b"Cloud-protected context telemetry data."
    encrypted_data = encryption_service.encrypt_envelope(plaintext)
    
    decrypted = encryption_service.decrypt_envelope(encrypted_data)
    assert decrypted == plaintext
