package de.tum.cit.aet.apollon.settings

import com.intellij.openapi.components.PersistentStateComponent
import com.intellij.openapi.components.RoamingType
import com.intellij.openapi.components.Service
import com.intellij.openapi.components.State
import com.intellij.openapi.components.Storage
import com.intellij.openapi.project.Project
import de.tum.cit.aet.apollon.protocol.AutoExport

/**
 * Per-project settings, mirroring the VS Code extension's workspace-scoped
 * `apollon.autoExport` configuration key. Stored outside `RoamingType.DEFAULT`
 * because "write a sibling image on save" is a project-local habit, not one a
 * user wants following them into every other project their IDE settings sync to.
 */
@Service(Service.Level.PROJECT)
@State(
    name = "ApollonSettings",
    storages = [Storage("apollon.xml", roamingType = RoamingType.DISABLED)],
)
class ApollonSettings : PersistentStateComponent<ApollonSettings.State> {
    data class State(var autoExport: String = AutoExport.off.name)

    private var state = State()

    var autoExport: AutoExport
        get() = runCatching { AutoExport.valueOf(state.autoExport) }.getOrDefault(AutoExport.off)
        set(value) {
            state.autoExport = value.name
        }

    override fun getState(): State = state

    override fun loadState(state: State) {
        this.state = state
    }

    companion object {
        fun getInstance(project: Project): ApollonSettings = project.getService(ApollonSettings::class.java)
    }
}
